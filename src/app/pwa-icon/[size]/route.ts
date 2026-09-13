import { ImageResponse } from "next/og";
import { createElement } from "react";

const SUPPORTED_SIZES = new Set([192, 512]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size: requestedSize } = await params;
  const iconSize = Number(requestedSize);

  if (!SUPPORTED_SIZES.has(iconSize)) {
    return new Response("Not found", { status: 404 });
  }

  const maskable = new URL(request.url).searchParams.get("maskable") === "1";
  const inset = maskable ? 0 : Math.round(iconSize * 0.08);

  return new ImageResponse(
    createElement(
      "div",
      {
        style: {
          alignItems: "center",
          background: "#f7f7f5",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          width: "100%",
        },
      },
      createElement(
        "div",
        {
          style: {
            alignItems: "center",
            background: "#065f46",
            borderRadius: maskable ? 0 : Math.round(iconSize * 0.2),
            color: "#ffffff",
            display: "flex",
            fontSize: Math.round(iconSize * 0.51),
            fontWeight: 800,
            height: iconSize - inset * 2,
            justifyContent: "center",
            letterSpacing: "-0.06em",
            width: iconSize - inset * 2,
          },
        },
        "B",
      ),
    ),
    {
      height: iconSize,
      width: iconSize,
      headers: {
        "Cache-Control": "public, max-age=86400",
      },
    },
  );
}
