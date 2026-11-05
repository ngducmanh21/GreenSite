import { parseRequest, simulate } from "@/lib/ems";
import { readJSON } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const { site, config } = parseRequest(await readJSON(request));
    return Response.json(simulate(site, config), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Yêu cầu không hợp lệ.",
      },
      { status: 400 },
    );
  }
}
