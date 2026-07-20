const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rcetbtewgkcnsarwksdx.supabase.co'
const supabaseAnonKey = 'sb_publishable_0XygNUvnmJtBze-s7NaFfQ_SijqgPTa'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  console.log('--- Querying public.user_roles ---')
  const { data: userRoles, error: rolesError } = await supabase
    .from('user_roles')
    .select('*')
  
  if (rolesError) {
    console.error('Error fetching user_roles:', rolesError)
  } else {
    console.log('user_roles rows:', JSON.stringify(userRoles, null, 2))
  }
}

test()
