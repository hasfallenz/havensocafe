import { NextResponse } from "next/server";
import { processHermesOwnerRequest, getOwnerBusinessSnapshot } from "@/lib/hermes-owner-agent";

export async function GET() {
  try {
    const snapshot = await getOwnerBusinessSnapshot();
    return NextResponse.json({
      success: true,
      data: snapshot,
    });
  } catch (error) {
    console.error("Error fetching business snapshot:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch business snapshot" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, history = [] } = body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { success: false, error: "Prompt is required" },
        { status: 400 }
      );
    }

    const response = await processHermesOwnerRequest(prompt.trim(), history);

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("Error processing Hermes Owner request:", error);
    return NextResponse.json(
      { success: false, error: "Hermes Agent failed to process request" },
      { status: 500 }
    );
  }
}
