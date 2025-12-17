/**
 * Script to generate slot records for all shelves
 * 
 * Creates 5 slots per shelf, numbered 1-5
 * Location code format: {zone}{aisle}-{bay}-{shelf}-{slot}
 * Example: A03-07-3-01
 */

import { createClient } from "@supabase/supabase-js"

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface InventoryGroup {
  id: string
  name: string
  mpath: string | null
  zone_code: string | null
  aisle_number: number | null
  bay_number: number | null
  shelf_number: number | null
  location_code: string | null
}

function generateUUID(): string {
  return crypto.randomUUID()
}

async function generateSlots() {
  console.log("Fetching all shelves...")
  
  // Fetch all shelves
  const { data: shelves, error: fetchError } = await supabase
    .from("inventory_groups")
    .select("id, name, mpath, zone_code, aisle_number, bay_number, shelf_number, location_code")
    .eq("type", "shelf")
    .is("deleted_at", null)
    .order("zone_code")
    .order("aisle_number")
    .order("bay_number")
    .order("shelf_number")

  if (fetchError) {
    console.error("Error fetching shelves:", fetchError)
    process.exit(1)
  }

  if (!shelves || shelves.length === 0) {
    console.log("No shelves found")
    process.exit(0)
  }

  console.log(`Found ${shelves.length} shelves`)

  // Check if slots already exist
  const { count: existingSlots } = await supabase
    .from("inventory_groups")
    .select("id", { count: "exact", head: true })
    .eq("type", "slot")
    .is("deleted_at", null)

  if (existingSlots && existingSlots > 0) {
    console.log(`Warning: ${existingSlots} slots already exist. Skipping generation.`)
    console.log("To regenerate, first delete existing slots.")
    process.exit(0)
  }

  // Generate slots for each shelf
  const slots: any[] = []
  const SLOTS_PER_SHELF = 5
  const now = new Date().toISOString()

  for (const shelf of shelves) {
    for (let slotNum = 1; slotNum <= SLOTS_PER_SHELF; slotNum++) {
      const slotId = generateUUID()
      const slotNumPadded = String(slotNum).padStart(2, "0")
      
      // Build location code: {zone}{aisle}-{bay}-{shelf}-{slot}
      // e.g., A03-07-3-01
      let locationCode: string | null = null
      if (shelf.zone_code && shelf.aisle_number != null && shelf.bay_number != null && shelf.shelf_number != null) {
        const aislePadded = String(shelf.aisle_number).padStart(2, "0")
        const bayPadded = String(shelf.bay_number).padStart(2, "0")
        locationCode = `${shelf.zone_code}${aislePadded}-${bayPadded}-${shelf.shelf_number}-${slotNumPadded}`
      }

      // Build mpath: parent_mpath.slot_id
      const mpath = shelf.mpath ? `${shelf.mpath}.${slotId}` : slotId

      // Build handle
      const handle = locationCode 
        ? `slot-${locationCode.toLowerCase()}` 
        : `slot-${slotId.slice(0, 8)}`

      slots.push({
        id: slotId,
        name: `Slot ${slotNumPadded}`,
        handle,
        description: null,
        mpath,
        is_active: true,
        rank: slotNum,
        metadata: null,
        type: "slot",
        zone_code: shelf.zone_code,
        aisle_number: shelf.aisle_number,
        bay_number: shelf.bay_number,
        shelf_number: shelf.shelf_number,
        slot_number: slotNum,
        location_code: locationCode,
        parent_group_id: shelf.id,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      })
    }
  }

  console.log(`Generated ${slots.length} slot records`)
  console.log("Inserting slots in batches...")

  // Insert in batches of 500
  const BATCH_SIZE = 500
  let inserted = 0

  for (let i = 0; i < slots.length; i += BATCH_SIZE) {
    const batch = slots.slice(i, i + BATCH_SIZE)
    
    const { error: insertError } = await supabase
      .from("inventory_groups")
      .insert(batch)

    if (insertError) {
      console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, insertError)
      process.exit(1)
    }

    inserted += batch.length
    console.log(`Inserted ${inserted}/${slots.length} slots`)
  }

  console.log(`\nSuccessfully created ${slots.length} slots!`)
  console.log(`- ${shelves.length} shelves × ${SLOTS_PER_SHELF} slots each = ${slots.length} total`)
}

// Run
generateSlots().catch(console.error)
