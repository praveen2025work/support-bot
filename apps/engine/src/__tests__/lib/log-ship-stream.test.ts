import { describe, it, expect } from "vitest";
import http from "http";
import type { AddressInfo } from "net";
import { createLogShipStream } from "@/lib/log-ship-stream";

function startServer(
  onRequest: (body: string, contentType: string | undefined) => void,
): Promise<http.Server> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let data = "";
      req.on("data", (c) => (data += c));
      req.on("end", () => {
        onRequest(data, req.headers["content-type"]);
        res.writeHead(204);
        res.end();
      });
    });
    server.listen(0, () => resolve(server));
  });
}

describe("createLogShipStream", () => {
  it("POSTs batched NDJSON to the sink with the right content-type", async () => {
    let received = "";
    let contentType: string | undefined;
    const server = await startServer((body, ct) => {
      received = body;
      contentType = ct;
    });
    try {
      const { port } = server.address() as AddressInfo;
      const stream = createLogShipStream({
        url: `http://127.0.0.1:${port}/push`,
        batchSize: 2,
      });
      stream.write('{"msg":"a"}\n');
      stream.write('{"msg":"b"}\n'); // reaching batchSize triggers a flush
      await new Promise((r) => setTimeout(r, 150));
      expect(received).toContain('{"msg":"a"}');
      expect(received).toContain('{"msg":"b"}');
      expect(contentType).toContain("application/x-ndjson");
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it("does not throw when the sink is unreachable", async () => {
    const stream = createLogShipStream({
      url: "http://127.0.0.1:1/down",
      batchSize: 1,
    });
    expect(() => stream.write('{"msg":"x"}\n')).not.toThrow();
    // Give the swallowed fetch rejection time to settle without crashing.
    await new Promise((r) => setTimeout(r, 50));
  });
});
