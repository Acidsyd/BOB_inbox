const axios = require('axios');

async function testAPI() {
  try {
    console.log('🔍 Testing inbox folder API with label filter...');
    
    // First get labels to see what exists
    const labelsResponse = await axios.get('http://localhost:4000/api/inbox/labels', {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // You'll need to replace this with a valid token
      }
    });
    
    console.log('✅ Available labels:', labelsResponse.data.labels);
    
    // Try to get inbox conversations with label filter
    if (labelsResponse.data.labels && labelsResponse.data.labels.length > 0) {
      const firstLabelId = labelsResponse.data.labels[0].id;
      console.log(`🔍 Testing with labelId: ${firstLabelId}`);
      
      const conversationsResponse = await axios.get(`http://localhost:4000/api/inbox/folders/inbox/conversations?labelIds=${firstLabelId}`, {
        headers: {
          'Authorization': 'Bearer YOUR_TOKEN_HERE' // You'll need to replace this with a valid token
        }
      });
      
      console.log('✅ Conversations with labels:', conversationsResponse.data);
    }
    
  } catch (error) {
    console.error('❌ API Test failed:', error.response?.status, error.response?.statusText);
    console.error('❌ Error details:', error.response?.data);
    console.error('❌ Full error:', error.message);
  }
}

console.log('Note: You need to get a valid JWT token first by logging in');
console.log('Or modify this script to test without auth for debugging');
testAPI();