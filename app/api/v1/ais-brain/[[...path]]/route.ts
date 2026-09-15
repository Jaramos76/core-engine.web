import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const AIS_ORIGIN =
  "http://ais-brain:4640";

type Context = {
  params: Promise<{
    path?: string[];
  }>;
};

async function forward(
  request: Request,
  context: Context,
) {
  const params =
    await context.params;

  const parts =
    params.path ?? [];

  const incoming =
    new URL(request.url);

  const pathname =
    "/"
    + parts
      .map(encodeURIComponent)
      .join("/");

  try {
    const upstream =
      await fetch(
        AIS_ORIGIN
        + pathname
        + incoming.search,
        {
          method:
            request.method,
          cache:
            "no-store",
          headers: {
            Accept:
              request.headers.get("accept")
              ?? "*/*",
          },
        },
      );

    const headers=
      new Headers();

    const type=
      upstream.headers.get(
        "content-type"
      );

    if (type) {
      headers.set(
        "Content-Type",
        type
      );
    }

    headers.set(
      "Cache-Control",
      "no-store"
    );

    if (request.method === "HEAD") {
      return new NextResponse(
        null,
        {
          status:upstream.status,
          headers,
        },
      );
    }

    return new NextResponse(
      await upstream.arrayBuffer(),
      {
        status:upstream.status,
        headers,
      },
    );

  } catch {
    return NextResponse.json(
      {
        error:"AIS-OS Brain unavailable",
      },
      {
        status:503,
      },
    );
  }
}

export async function GET(
  request:Request,
  context:Context,
) {
  return forward(
    request,
    context
  );
}

export async function HEAD(
  request:Request,
  context:Context,
) {
  return forward(
    request,
    context
  );
}

// Mutations stay behind the existing session boundary and same-origin checks.
export async function POST(request: Request, context: Context) {
  const { requireApiSession } = await import("@/lib/auth/session");
  const unauthenticated = await requireApiSession();
  if (unauthenticated) return unauthenticated;
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || new URL(origin).host !== host) {
    return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  }
  const { path = [] } = await context.params;
  if (path.length !== 2 || path[0] !== "api" || !["repair", "create"].includes(path[1])) {
    return NextResponse.json({ error: "Unsupported mutation" }, { status: 405 });
  }
  return forward(request, context);
}
