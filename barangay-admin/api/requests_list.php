<?php
require __DIR__ . '/config.php';

/**
 * Returns:
 * {
 *   total: number,
 *   rows: [
 *     { id, ref, citizen, type, status, requested_at, updated, form_url, post_pay }
 *   ]
 * }
 *
 * post_pay = true if there exists at least one history row with to_status='payment_pending' for this request.
 */

try {
  // Basic list (filtering client-side). You can add q/status query params if desired.
  $sql = "
    SELECT
      r.id,
      r.ref,
      c.full_name AS citizen,
      t.name      AS type,
      r.status,
      r.requested_at,
      r.updated_at AS updated,
      (
        SELECT rf.file_path
        FROM request_files rf
        WHERE rf.request_id = r.id AND rf.kind='application_form'
        ORDER BY rf.uploaded_at DESC
        LIMIT 1
      ) AS form_url,
      EXISTS(
        SELECT 1
        FROM request_status_history h
        WHERE h.request_id = r.id AND h.to_status = 'payment_pending'
      ) AS post_pay
    FROM requests r
      JOIN citizens c     ON c.id = r.citizen_id
      JOIN request_types t ON t.id = r.type_id
    ORDER BY r.updated_at DESC
  ";

  $stmt = $pdo->query($sql);
  $rows = $stmt->fetchAll();

  // Normalize booleans and date strings
  foreach ($rows as &$row){
    $row['post_pay'] = $row['post_pay'] ? true : false;
    // you may also want to prefix form path with ./forms/ if it's relative
    if ($row['form_url']) {
      // ensure relative URL
      if (strpos($row['form_url'], 'http') !== 0 && strpos($row['form_url'], './') !== 0 && strpos($row['form_url'], '/') !== 0) {
        $row['form_url'] = './' . ltrim($row['form_url'], '/');
      }
    }
  }

  json_out(['total' => count($rows), 'rows' => $rows]);
} catch (Throwable $e){
  json_out(['error' => 'Failed to load requests'], 500);
}
