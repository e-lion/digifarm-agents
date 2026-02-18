
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tmnwelptumpgaasmlyvv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtbndlbHB0dW1wZ2Fhc21seXZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNTI4NzcsImV4cCI6MjA4NjkyODg3N30.CYylzi4y9-lG_wWmsLXFzMh8hoZ5yZcZEHP1Gc1S7Lg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function debug() {
  console.log('--- FETCHING BUYERS ---')
  const { data: buyers } = await supabase.from('buyers').select('name').limit(10)
  console.log('Buyers:', buyers?.map(b => `'${b.name}'`).join(', '))

  console.log('\n--- FETCHING VISITS ---')
  const { data: visits } = await supabase.from('visits').select('buyer_name, status, agent_id, profiles(full_name)').limit(10)
  console.log('Visits:', JSON.stringify(visits, null, 2))

  if (buyers && visits) {
    const buyerNames = new Set(buyers.map(b => b.name))
    visits.forEach(v => {
      if (buyerNames.has(v.buyer_name)) {
        console.log(`\nMatch found for: '${v.buyer_name}'`)
      } else {
        console.log(`\nNO MATCH for visit buyer: '${v.buyer_name}'`)
      }
    })
  }
}

debug()
