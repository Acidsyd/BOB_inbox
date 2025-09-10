const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function fixConversationTimestamps() {
  console.log('🔧 Fixing conversation timestamp trigger to use email time instead of sync time...');

  try {
    // Fix the trigger function to use only email timestamps, not sync time
    const fixedTriggerSQL = `
      CREATE OR REPLACE FUNCTION update_conversation_metadata()
      RETURNS TRIGGER AS $$
      BEGIN
          -- Update conversation stats and preview
          UPDATE conversations SET
              message_count = (
                  SELECT COUNT(*) FROM conversation_messages 
                  WHERE conversation_id = COALESCE(NEW.conversation_id, OLD.conversation_id)
              ),
              unread_count = (
                  SELECT COUNT(*) FROM conversation_messages 
                  WHERE conversation_id = COALESCE(NEW.conversation_id, OLD.conversation_id)
                  AND direction = 'received' 
                  AND is_read = false
              ),
              -- FIXED: Use only the actual email timestamp, not sync time
              last_activity_at = (
                  SELECT MAX(COALESCE(sent_at, received_at)) FROM conversation_messages 
                  WHERE conversation_id = COALESCE(NEW.conversation_id, OLD.conversation_id)
                  AND COALESCE(sent_at, received_at) IS NOT NULL
              ),
              last_message_preview = (
                  SELECT content_preview FROM conversation_messages 
                  WHERE conversation_id = COALESCE(NEW.conversation_id, OLD.conversation_id)
                  ORDER BY COALESCE(sent_at, received_at) DESC NULLS LAST
                  LIMIT 1
              ),
              updated_at = now()
          WHERE id = COALESCE(NEW.conversation_id, OLD.conversation_id);
          
          RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql;
    `;

    const { error: functionError } = await supabase.rpc('exec', { 
      query: fixedTriggerSQL 
    });

    if (functionError) {
      console.error('❌ Failed to update trigger function:', functionError);
      return;
    }

    console.log('✅ Trigger function updated successfully');

    // Now update existing conversations to use correct timestamps
    console.log('🔄 Updating existing conversation timestamps...');

    const updateExistingSQL = `
      UPDATE conversations SET
          last_activity_at = (
              SELECT MAX(COALESCE(cm.sent_at, cm.received_at)) 
              FROM conversation_messages cm 
              WHERE cm.conversation_id = conversations.id
              AND COALESCE(cm.sent_at, cm.received_at) IS NOT NULL
          )
      WHERE id IN (
          SELECT DISTINCT conversation_id 
          FROM conversation_messages 
          WHERE COALESCE(sent_at, received_at) IS NOT NULL
      );
    `;

    const { error: updateError } = await supabase.rpc('exec', { 
      query: updateExistingSQL 
    });

    if (updateError) {
      console.error('❌ Failed to update existing conversations:', updateError);
      return;
    }

    console.log('✅ Updated existing conversation timestamps');
    
    // Check results
    const { data: sampleData } = await supabase
      .from('conversations')
      .select('id, subject, last_activity_at')
      .limit(5);

    if (sampleData) {
      console.log('📊 Sample updated conversations:');
      sampleData.forEach(conv => {
        console.log(`  ${conv.subject?.substring(0, 30)}... -> ${conv.last_activity_at}`);
      });
    }

    console.log('🎉 Conversation timestamp fix completed successfully!');

  } catch (error) {
    console.error('❌ Error fixing conversation timestamps:', error);
  }
}

fixConversationTimestamps();