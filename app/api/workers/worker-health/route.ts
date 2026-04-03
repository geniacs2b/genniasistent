import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[Worker Health] 🩺 Diagnostic request received:", body);
    
    return NextResponse.json({ 
        status: "alive", 
        timestamp: new Date().toISOString(),
        received_body: body 
    });
  } catch (err: any) {
    console.error("[Worker Health] Error parsing request:", err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// No signature verification here for reachability testing
