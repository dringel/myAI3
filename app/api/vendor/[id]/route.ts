// app/api/vendor/[id]/route.ts
// @ts-nocheck

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase"; // FIXED

/**
 * GET /api/vendor/:id
 * Returns canonical vendor row plus images, offers and recent reviews.
 */
export async function GET(req: Request, context: any) {
  const params = await Promise.resolve(context?.params || {});
  const id = params?.id;

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  // FIX: runtime-safe client (NO module-level supabase)
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      {
        error:
          "Supabase not configured. Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in Vercel.",
      },
      { status: 500 }
    );
  }

  try {
    // 1) Fetch vendor main record
    const { data: vendor, error: vendorErr } = await supabase
      .from("vendors")
      .select("*")
      .eq("id", id)
      .single();

    if (vendorErr || !vendor) {
      return NextResponse.json(
        { error: vendorErr?.message || "vendor not found" },
        { status: 404 }
      );
    }

    // 2) Fetch related content in parallel
    const [imagesRes, offersRes, reviewsRes] = await Promise.all([
      supabase
        .from("vendor_images")
        .select("*")
        .eq("vendor_id", id)
        .order("uploaded_at", { ascending: false })
        .limit(12),

      supabase
        .from("vendor_offers")
        .select("*")
        .eq("vendor_id", id)
        .order("updated_at", { ascending: false })
        .limit(10),

      supabase
        .from("vendor_reviews")
        .select("*")
        .eq("vendor_id", id)
        .order("review_ts", { ascending: false })
        .limit(8),
    ]);

    return NextResponse.json({
      vendor,
      images: imagesRes?.data ?? [],
      offers: offersRes?.data ?? [],
      reviews: reviewsRes?.data ?? [],
    });
  } catch (err: any) {
    console.error("api/vendor error:", err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
