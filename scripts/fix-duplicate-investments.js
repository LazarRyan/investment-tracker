// Script to identify and remove duplicate investments
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase credentials not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findDuplicateInvestments() {
  console.log('Connecting to Supabase...');
  
  try {
    // Get all investments
    const { data: investments, error } = await supabase
      .from('investments')
      .select('*');
    
    if (error) {
      throw error;
    }
    
    console.log(`Found ${investments.length} total investments`);
    
    // Group investments by user_id and symbol
    const groupedInvestments = {};
    investments.forEach(inv => {
      const key = `${inv.user_id}:${inv.symbol}:${inv.purchase_price}:${inv.shares}`;
      groupedInvestments[key] = groupedInvestments[key] || [];
      groupedInvestments[key].push(inv);
    });
    
    // Find duplicates (groups with more than one investment)
    const duplicates = Object.values(groupedInvestments).filter(group => group.length > 1);
    
    if (duplicates.length === 0) {
      console.log('No duplicate investments found!');
      return null;
    }
    
    console.log(`Found ${duplicates.length} groups of duplicate investments`);
    
    // Format duplicates for review
    const duplicateData = duplicates.map(group => {
      const sample = group[0];
      return {
        user_id: sample.user_id,
        symbol: sample.symbol,
        shares: sample.shares,
        purchase_price: sample.purchase_price,
        count: group.length,
        ids: group.map(inv => inv.id)
      };
    });
    
    console.log('Duplicate investments:');
    console.table(duplicateData);
    
    return duplicateData;
  } catch (error) {
    console.error('Error finding duplicate investments:', error);
    return null;
  }
}

async function removeDuplicates(duplicateData) {
  if (!duplicateData || duplicateData.length === 0) {
    console.log('No duplicates to remove');
    return;
  }
  
  console.log('Removing duplicate investments...');
  
  try {
    let removedCount = 0;
    
    for (const duplicate of duplicateData) {
      // Keep the first one, remove the rest
      const idsToRemove = duplicate.ids.slice(1);
      
      console.log(`Removing ${idsToRemove.length} duplicates for ${duplicate.symbol} (user: ${duplicate.user_id})`);
      
      const { error } = await supabase
        .from('investments')
        .delete()
        .in('id', idsToRemove);
      
      if (error) {
        console.error(`Error removing duplicates for ${duplicate.symbol}:`, error);
      } else {
        removedCount += idsToRemove.length;
      }
    }
    
    console.log(`Successfully removed ${removedCount} duplicate investments`);
  } catch (error) {
    console.error('Error removing duplicates:', error);
  }
}

// Main function
async function main() {
  try {
    // Prompt for confirmation before running in production
    if (process.env.NODE_ENV === 'production') {
      console.warn('\n⚠️  WARNING: You are running this script in PRODUCTION mode! ⚠️');
      console.warn('This will permanently delete duplicate investments.\n');
      
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      await new Promise(resolve => {
        readline.question('Type "YES" to continue: ', answer => {
          readline.close();
          if (answer !== 'YES') {
            console.log('Operation cancelled.');
            process.exit(0);
          }
          resolve();
        });
      });
    }
    
    // Find duplicates
    const duplicateData = await findDuplicateInvestments();
    
    // If duplicates found, ask for confirmation before removing
    if (duplicateData && duplicateData.length > 0) {
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      await new Promise(resolve => {
        readline.question('\nDo you want to remove these duplicates? Type "YES" to confirm: ', answer => {
          readline.close();
          if (answer === 'YES') {
            resolve(true);
          } else {
            console.log('Duplicate removal cancelled.');
            resolve(false);
          }
        });
      }).then(shouldRemove => {
        if (shouldRemove) {
          return removeDuplicates(duplicateData);
        }
      });
    }
    
    console.log('Script completed.');
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

main(); 