const axios = require("axios");
require("dotenv").config();
const fs = require("fs");

const STATE_FILE = "migration_state.json";
// --- Save progress ---
function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state));
}
// --- Load progress ---
function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  }
  return { page: 1, totalMigrated: 0 };
}
// --- helper to resolve category slug -> id ---
async function ensureCategory(targetAPI, category) {
  try {
    // Check if category exists by slug
    const { data: existing } = await targetAPI.get(
      "/wp-json/wc/v3/products/categories",
      { params: { slug: category.slug } }
    );

    if (existing.length > 0) {
      return existing[0].id; // ✅ Found ID
    }

    // Create new category if missing
    const { data: created } = await targetAPI.post(
      "/wp-json/wc/v3/products/categories",
      { name: category.name, slug: category.slug }
    );

    return created.id;
  } catch (err) {
    console.error(
      "❌ Category sync failed:",
      err.response?.data || err.message
    );
    return null;
  }
}
// Helper to ensure a brand exists on target site.
async function ensureBrand(targetAPI, brand) {
  try {
    const { data: existing } = await targetAPI.get(
      "/wp-json/wc/v3/products/brands",
      { params: { slug: brand.slug } }
    );
    if (existing.length) return existing[0].id;

    const { data: created } = await targetAPI.post(
      "/wp-json/wc/v3/products/brands",
      { name: brand.name, slug: brand.slug }
    );
    return created.id;
  } catch (e) {
    console.error("Brand sync failed:", e.response?.data || e.message);
    return null;
  }
}

async function migrateAllProducts() {
  console.log("🚀 Starting full migration...");

  // Source API
  const sourceAPI = axios.create({
    baseURL: process.env.SOURCE_URL,
    auth: {
      username: process.env.SOURCE_CONSUMER_KEY,
      password: process.env.SOURCE_CONSUMER_SECRET,
    },
    timeout: 60000,
  });

  // Target API
  const targetAPI = axios.create({
    baseURL: process.env.TARGET_URL,
    auth: {
      username: process.env.TARGET_CONSUMER_KEY,
      password: process.env.TARGET_CONSUMER_SECRET,
    },
    timeout: 60000,
  });
  // 🔹 Load last progress
  let state = loadState();
  let page = state.page;
  let totalMigrated = state.totalMigrated;
  let hasMore = true;

//   let page = 1;
//   let totalMigrated = 0;
//   let hasMore = true;
console.log("page data ", state)
  while (hasMore) {
    console.log(`📥 Fetching page ${page}...`);

    try {
      const response = await sourceAPI.get(`/wp-json/wc/v3/products`, {
        params: { per_page: 100, page },
      });

      const products = response.data;
      if (!products.length) {
        hasMore = false;
        break;
      }

      for (let product of products) {
        console.log(`\n🔄 Processing: ${product.name}`);

        // Filter fields WooCommerce allows
        function buildWooAPIProduct(p) {
        //   console.log(p);
          return {
            name: p?.name ?? "",
            slug: p?.slug ?? "",
            permalink: p?.permalink ?? "",
            date_created: p?.date_created ?? null,
            date_created_gmt: p?.date_created_gmt ?? null,
            date_modified: p?.date_modified ?? null,
            date_modified_gmt: p?.date_modified_gmt ?? null,
            type: p?.type ?? "simple",
            status: p?.status ?? "publish",
            featured: p?.featured ?? false,
            catalog_visibility: p?.catalog_visibility ?? "visible",
            description: p?.description ?? "",
            short_description: p?.short_description ?? "",
            sku: p?.sku ?? "",
            price: p?.price ?? "",
            regular_price: p?.regular_price ?? "",
            sale_price: p?.sale_price ?? "",
            date_on_sale_from: p?.date_on_sale_from ?? null,
            date_on_sale_from_gmt: p?.date_on_sale_from_gmt ?? null,
            date_on_sale_to: p?.date_on_sale_to ?? null,
            date_on_sale_to_gmt: p?.date_on_sale_to_gmt ?? null,
            on_sale: p?.on_sale ?? false,
            purchasable: p?.purchasable ?? true,
            total_sales: p?.total_sales ?? 0,
            virtual: p?.virtual ?? false,
            downloadable: p?.downloadable ?? false,
            downloads: p?.downloads ?? [],
            download_limit: p?.download_limit ?? -1,
            download_expiry: p?.download_expiry ?? -1,
            external_url: p?.external_url ?? "",
            button_text: p?.button_text ?? "",
            tax_status: p?.tax_status ?? "taxable",
            tax_class: p?.tax_class ?? "",
            manage_stock: p?.manage_stock ?? false,
            stock_quantity: p?.stock_quantity ?? null,
            backorders: p?.backorders ?? "no",
            backorders_allowed: p?.backorders_allowed ?? false,
            backordered: p?.backordered ?? false,
            low_stock_amount: p?.low_stock_amount ?? null,
            sold_individually: p?.sold_individually ?? false,
            weight: p?.weight ?? "",
            dimensions: {
              length: p?.dimensions?.length ?? "",
              width: p?.dimensions?.width ?? "",
              height: p?.dimensions?.height ?? "",
            },
            shipping_required: p?.shipping_required ?? true,
            shipping_taxable: p?.shipping_taxable ?? true,
            shipping_class: p?.shipping_class ?? "",
            shipping_class_id: p?.shipping_class_id ?? 0,
            reviews_allowed: p?.reviews_allowed ?? true,
            average_rating: p?.average_rating ?? "0.00",
            rating_count: p?.rating_count ?? 0,
            upsell_ids: p?.upsell_ids ?? [],
            cross_sell_ids: p?.cross_sell_ids ?? [],
            parent_id: p?.parent_id ?? 0,
            purchase_note: p?.purchase_note ?? "",
            categories: [],
            brands: [] ,
            tags:
              p?.tags?.map((tag) => ({
               
               
                ...tag
              })) ?? [],
            images:
              p?.images?.map((img) => ({
                src: img?.src ?? "",
                name: img?.name ?? "",
                alt: img?.alt ?? p?.name ?? "",
                // ...img
              })) ?? [],
            attributes: p?.attributes ?? [],
            default_attributes: p?.default_attributes ?? [],
            variations: p?.variations ?? [],
            grouped_products: p?.grouped_products ?? [],
            menu_order: p?.menu_order ?? 0,
            price_html: p?.price_html ?? "",
            related_ids: p?.related_ids ?? [],
            meta_data: p?.meta_data ?? [],
            stock_status: p?.stock_status ?? "instock",
            has_options: p?.has_options ?? false,
            post_password: p?.post_password ?? "",
            global_unique_id: p?.global_unique_id ?? "",
            // Usually not needed in create/update requests
            _links: p?._links ?? {},
          };
        }

        const cleanProduct = buildWooAPIProduct(product);

        // --- Resolve categories ---
        let categoryIds = [];
        if (product?.categories?.length) {
          for (let c of product.categories) {
            const id = await ensureCategory(targetAPI, {
              name: c.name,
              slug: c.slug,
            });
            if (id) categoryIds.push({ id });
          }
        }
        cleanProduct.categories = categoryIds;
        // --- Resolve brands ---
        let brandIds = [];
        if (product?.brands?.length) {
          for (let b of product.brands) {
            const id = await ensureBrand(targetAPI, {
              name: b.name,
              slug: b.slug,
            });
            if (id) brandIds.push({ id });
          }
        }
        cleanProduct.brands = brandIds;

        // --- Save product with retries ---
        let retries = 3;
        while (retries > 0) {
          try {
            const result = await targetAPI.post(
              "/wp-json/wc/v3/products",
              cleanProduct
            );
            totalMigrated++;
            console.log(
              `✅ Migrated: ${result.data.name} (New ID: ${result.data.id}) | Total so far: ${totalMigrated}`
            );
             // 🔹 Save progress after each product
            saveState({ page, totalMigrated });
            break; // success → exit retry loop
          } catch (err) {
            retries--;
            console.log(
              `❌ Failed: ${
                err.response?.data?.message || err.message
              } | Retries left: ${retries}`
            );
            if (retries === 0) {
              console.log(`⚠️ Skipping product: ${product.name}`);
            } else {
              await new Promise((r) => setTimeout(r, 2000)); // wait 5s before retry
            }
          }
        }

        // avoid rate-limit
        await new Promise((r) => setTimeout(r, 1000));
      }

      page++;
    } catch (err) {
      console.error("❌ Page fetch failed:", err.message);
      break;
    }
  }

  console.log(`\n🎉 Migration finished! Total migrated: ${totalMigrated}`);
}

migrateAllProducts();
