<?php
require __DIR__ . '/config.php';

/**
 * Input JSON:
 * { id: number, to_status: 'on_queue'|'processing'|'payment_pending'|'ready_for_pick_up'|'released' }
 *
 * Enforces the guided flow:
 *  - on_queue -> (on_queue|processing)
 *  - processing -> (payment_pending) unless post_pay then (ready_for_pick_up)
 *  - payment_pending -> (processing) (marks post_pay)
 *  - ready_for_pick_up -> (released)
 *  - released -> [] (no changes)
 */

$allowed = ['on_queue','processing','payment_pending','ready_for_pick_up','released'];

$body = json_decode(file_get_contents('php://input'), true);
$id = isset($body['id']) ? intval($body['id']) : 0;
$to = isset($body['to_status']) ? $body['to_status'] : null;

if (!$id || !in_array($to, $allowed, true)){
  json_out(['error' => 'Invalid payload'], 400);
}

try{
  // Load current row + post_pay flag
  $sql = "
    SELECT
      r.id, r.status,
      EXISTS(
        SELECT 1 FROM request_status_history h
        WHERE h.request_id = r.id AND h.to_status = 'payment_pending'
      ) AS post_pay
    FROM requests r
    WHERE r.id = ?
    LIMIT 1
  ";
  $st = $pdo->prepare($sql);
  $st->execute([$id]);
  $row = $st->fetch();
  if (!$row) json_out(['error' => 'Request not found'], 404);

  $curr = $row['status'];
  $postPay = $row['post_pay'] ? true : false;

  // Compute allowed next based on current state + postPay
  $opts = [];
  switch($curr){
    case 'on_queue':          $opts = ['on_queue','processing']; break;
    case 'processing':        $opts = $postPay ? ['ready_for_pick_up'] : ['payment_pending']; break;
    case 'payment_pending':   $opts = ['processing']; break;
    case 'ready_for_pick_up': $opts = ['released']; break;
    case 'released':          $opts = []; break;
    default:                  $opts = []; break;
  }

  if (!in_array($to, $opts, true)){
    json_out(['error' => "Transition not allowed from {$curr} to {$to}"], 400);
  }

  // Perform update
  $pdo->beginTransaction();

  $upd = $pdo->prepare("UPDATE requests SET status=?, updated_at=NOW() WHERE id=?");
  $upd->execute([$to, $id]);

  $hist = $pdo->prepare("
    INSERT INTO request_status_history (request_id, from_status, to_status, changed_by_user_id, note)
    VALUES (?, ?, ?, NULL, 'API')
  ");
  $hist->execute([$id, $curr, $to]);

  // Recompute post_pay after change (flip true when payment_pending -> processing)
  if ($curr === 'payment_pending' && $to === 'processing') {
    $postPay = true;
  }

  // Get latest row fields we expose
  $sel = $pdo->prepare("
    SELECT r.status, r.updated_at AS updated,
           EXISTS(SELECT 1 FROM request_status_history h WHERE h.request_id=r.id AND h.to_status='payment_pending') AS post_pay
    FROM requests r WHERE r.id=? LIMIT 1
  ");
  $sel->execute([$id]);
  $latest = $sel->fetch();
  $pdo->commit();

  json_out([
    'ok' => true,
    'row' => [
      'status'  => $latest['status'],
      'updated' => $latest['updated'],
      'post_pay'=> $latest['post_pay'] ? true : false
    ]
  ]);
} catch (Throwable $e){
  if ($pdo->inTransaction()) $pdo->rollBack();
  json_out(['error' => 'Update failed'], 500);
}
