/** Read a bounded body even when Content-Length is absent or misleading. */
export async function readJSON(
  request: Request,
  maxBytes = 20000,
): Promise<unknown> {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new Error("Cần gửi JSON.");
  if (!request.body) throw new Error("Thiếu nội dung yêu cầu.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error("Yêu cầu quá lớn.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error("JSON không hợp lệ.");
  }
}
