// lib/db/getVendorDetails.ts
// @ts-nocheck

import { getSupabaseAdmin } from "../supabase";

/**
 * Runtime-safe Supabase admin getter.
 */
function getClient() {
  const client = getSupabaseAdmin();
  if (!client) {
    throw new Error("Supabase admin client is not configured. Missing env vars.");
  }
  return client;
}

/**
 * Fetch vendor details + images + offers + reviews cleanly.
 */
export async function getVendorDetails(vendorId: string) {
  if (!vendorId) return null;

  const supabase = getClient();

  // 1. Vendor core row
  const { data: vendor, error: vendorErr } = await supabase
    .from("vendors")
    .select("*")
    .eq("id", vendorId)
    .single();

  if (vendorErr || !vendor) {
    console.warn("Vendor not found:", vendorErr);
    return null;
  }

  // 2. Images
  const { data: images } = await supabase
    .from("vendor_images")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("is_main", { ascending: false })
    .order("uploaded_at", { ascending: false })
    .limit(12);

  // 3. Offers
  const { data: offers } = await supabase
    .from("vendor_offers")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("price", { ascending: true })
    .limit(10);

  // 4. Recent reviews (with new schema)
  const { data: reviews } = await supabase
    .from("vendor_reviews")
    .select("id, reviewer_name, rating, title, body, review_ts, source")
    .eq("vendor_id", vendorId)
    .order("review_ts", { ascending: false })
    .limit(8);

  // 5. Stats: rating count & avg rating
  const { data: statsRaw } = await supabase
    .from("vendor_reviews")
    .select("rating", { count: "exact" })
    .eq("vendor_id", vendorId);

  const review_count = statsRaw?.length ?? 0;
  const avg_rating =
    reviews && reviews.length
      ? Number(
          (
            reviews.reduce((a, r) => a + (r.rating || 0), 0) / reviews.length
          ).toFixed(2)
        )
      : vendor.avg_rating || 0;

  return {
    vendor,
    images: images || [],
    offers: offers || [],
    top_reviews: reviews || [],
    stats: {
      review_count,
      avg_rating,
    },
  };
}
