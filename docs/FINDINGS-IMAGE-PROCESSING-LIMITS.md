# Vulnerability Finding: Unvalidated Image Dimensions and Permissive Decoder Loop

- **Finding ID**: VIZ-SEC-001
- **Target**: `POST /api/images` & Background Image Processing Worker
- **Severity**: Medium
- **Category**: Resource Management / Denial of Service ([CWE-400: Uncontrolled Resource Consumption](https://cwe.mitre.org/data/definitions/400.html) / [CWE-770: Allocation of Resources Without Limits or Throttling](https://cwe.mitre.org/data/definitions/770.html))

## 1. Summary

The upload endpoint accepted an image file with large declared dimensions (`65,535 x 65,535` pixels, 141 bytes on disk) without validating dimension bounds before enqueueing a background processing task.

When the worker handed the truncated image buffer to `libvips`, the decoder operated in permissive mode. `libvips` attempted to read 65,535 scanlines from a single-scanline payload and entered a tight loop, outputting thousands of warning messages (`WARN: VIPS: not enough data`) and consuming CPU cycles.

Without proper limits and early fails in the image processing pipeline, an attacker could send thousands of requests a second to a `viz` server with small payloads and commit a Denial of Service (DOS) attack.

## 2. Technical Details

- **Affected Endpoint**: `POST /api/images`
- **Component**: `viz/cmd/api/routes/images.go` & `viz/internal/images/ops`
- **Behavior**:
  1. The API endpoint accepted the upload with `201 Created` and enqueued a `TopicImageProcess` job.
  2. The worker passed the image buffer to `libvips` without checking declared dimensions against memory limits.
  3. `libvips` defaulted to non-fatal warning mode and repeatedly iterated over missing scanlines, flooding system logs and stalling the image queue.

## 3. Proof of Concept

1. Generate the test image fixture:
```bash
   pnpm tsx payloads/dimensions/generate_dimension_fixtures.ts -w 65535 -h 65535 -o sample_65k.png
```
2. Upload the file to the endpoint:
```bash
   echo "$VIZ_API_KEY" | pnpm tsx pocs/test_upload_dimensions.ts -f payloads/dimensions/samples/sample_65k.png http://localhost:7770
```
3. Observe the worker process logs flooding with `WARN: VIPS: not enough data`.
4. Logs such as the following below may appear:

```bash
[09-25-2026 20:40:34.936] WARN: VIPS: not enough data
[09-25-2026 20:40:34.936] WARN: VIPS: not enough data
[09-25-2026 20:40:34.936] WARN: VIPS: not enough data
[09-25-2026 20:40:34.936] WARN: VIPS: not enough data
[09-25-2026 20:40:34.936] WARN: VIPS: not enough data
[09-25-2026 20:40:34.955] INFO: VIPS: threadpool completed with 2 workers
[09-25-2026 20:40:34.967] DEBUG: finished generating thumbhash {
  "duration": 5,
  "name": "dimension_65kx65k",
  "uid": "hYRwq4wwiexFty5budgamyZk"
}
[09-25-2026 20:40:34.967] DEBUG: GenerateTransformFromPath: generating transform {
  "name": "dimension_65kx65k",
  "path": "/images/hYRwq4wwiexFty5budgamyZk/file?format=webp\u0026h=400\u0026quality=85\u0026w=400",
  "uid": "hYRwq4wwiexFty5budgamyZk"
}
[09-25-2026 20:40:34.968] INFO: VIPS: residual reducev by 0.00610361
[09-25-2026 20:40:34.968] INFO: VIPS: shrinkv by 81
[09-25-2026 20:40:34.968] INFO: VIPS: reducev: 13 point mask
[09-25-2026 20:40:34.969] INFO: VIPS: residual reduceh by 0.00610361
[09-25-2026 20:40:34.969] INFO: VIPS: shrinkh by 81
[09-25-2026 20:40:34.969] INFO: VIPS: reduceh: 13 point mask
[09-25-2026 20:40:34.986] INFO: VIPS: vips__open_image_write: opening with O_TMPFILE
[09-25-2026 20:40:34.994] WARN: VIPS: Not enough image data
[09-25-2026 20:40:34.994] WARN: VIPS: error in tile 0 x 0
[09-25-2026 20:40:34.995] INFO: VIPS: threadpool completed with 2 workers
[09-25-2026 20:40:34.998] INFO: VIPS: threadpool completed with 2 workers
[09-25-2026 20:40:35.022] INFO: VIPS: threadpool completed with 2 workers
```

## 4. Remediation Options

### Configure `libvips` Fail-Fast

Configure `libvips` loader routines (`vips_pngload_buffer`, `vips_image_new_from_buffer`) with `"fail", TRUE` or `VIPS_FAIL_ON_WARNING`. This forces `libvips` to terminate and return an error immediately on the first missing block instead of looping through all scanlines.

### Maximum Resolution Cap

Define a configurable maximum resolution limit in `viz.json` (such as `200` Megapixels). Validate image headers during upload and reject files that exceed the threshold with `400 Bad Request`.

### Decompression Ratio Threshold

Compute the ratio between the declared uncompressed image size ($\text{Width} \times \text{Height} \times \text{Channels}$) and the compressed file size on disk. Flag or reject files that exceed abnormal compression thresholds (e.g. $> 500 : 1$).
