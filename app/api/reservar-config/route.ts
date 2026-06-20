import { NextResponse } from "next/server";
import { getBookingConfig } from "@/lib/store";

export const dynamic = "force-dynamic";

// GET /api/reservar-config → servicios activos + profesionales activas (para el wizard)
export async function GET() {
  try {
    const { services, staff } = await getBookingConfig();
    return NextResponse.json({ ok: true, services, staff });
  } catch {
    return NextResponse.json({ ok: false, services: [], staff: [] }, { status: 500 });
  }
}
