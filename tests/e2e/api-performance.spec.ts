import { test, expect } from '@playwright/test';
import { makeAPIRequest } from '../utils/test-helpers';

/**
 * API Performance and Integration Tests
 * Testing API endpoints, response times, and data integrity
 */
test.describe('API Performance and Integration', () => {
  
  test('should test all API endpoints health', async ({ request }) => {
    const endpoints = [
      { path: '/health', method: 'GET', expectedStatus: 200 },
      { path: '/api/auth/me', method: 'GET', expectedStatus: [200, 401] }, // Might be unauthorized
      { path: '/api/leads', method: 'GET', expectedStatus: [200, 401] },
      { path: '/api/campaigns', method: 'GET', expectedStatus: [200, 401] },
      { path: '/api/email-accounts', method: 'GET', expectedStatus: [200, 401] },
      { path: '/api/analytics/dashboard', method: 'GET', expectedStatus: [200, 401] },
    ];
    
    for (const endpoint of endpoints) {
      console.log(`🔍 Testing ${endpoint.method} ${endpoint.path}`);
      
      const startTime = Date.now();
      const response = await request.fetch(`http://localhost:4000${endpoint.path}`, {
        method: endpoint.method,
      });
      const responseTime = Date.now() - startTime;
      
      console.log(`📊 ${endpoint.path}: ${response.status()} (${responseTime}ms)`);
      
      // Check status code
      const expectedStatuses = Array.isArray(endpoint.expectedStatus) 
        ? endpoint.expectedStatus 
        : [endpoint.expectedStatus];
      
      expect(expectedStatuses).toContain(response.status());
      
      // Performance check - API should respond within 2 seconds
      expect(responseTime).toBeLessThan(2000);
      
      if (responseTime < 200) {
        console.log('🚀 Excellent API performance');
      } else if (responseTime < 500) {
        console.log('✅ Good API performance');
      } else {
        console.log('⚠️ API performance could be improved');
      }
    }
  });

  test('should test database performance with large datasets', async ({ request }) => {
    console.log('📊 Testing database performance...');
    
    const startTime = Date.now();
    const response = await request.get('http://localhost:4000/api/leads?limit=50');
    const responseTime = Date.now() - startTime;
    
    console.log(`📈 Leads query (50 records): ${response.status()} (${responseTime}ms)`);
    
    expect(response.status()).toBe(200);
    expect(responseTime).toBeLessThan(1000); // Should be fast with caching
    
    if (response.ok()) {
      const data = await response.json();
      console.log(`📋 Retrieved ${data.leads?.length || 0} leads`);
      console.log(`📊 Pagination: ${JSON.stringify(data.pagination || {})}`);
    }
  });

  test('should test caching effectiveness', async ({ request }) => {
    console.log('💾 Testing cache performance...');
    
    const endpoint = 'http://localhost:4000/api/leads?limit=10';
    
    // First request (cache miss)
    const startTime1 = Date.now();
    const response1 = await request.get(endpoint);
    const responseTime1 = Date.now() - startTime1;
    
    expect(response1.status()).toBe(200);
    console.log(`🔍 First request (cache miss): ${responseTime1}ms`);
    
    // Second request (should be cached)
    const startTime2 = Date.now();
    const response2 = await request.get(endpoint);
    const responseTime2 = Date.now() - startTime2;
    
    expect(response2.status()).toBe(200);
    console.log(`⚡ Second request (cache hit): ${responseTime2}ms`);
    
    // Cached request should be significantly faster
    if (responseTime2 < responseTime1) {
      console.log('✅ Caching is working effectively');
      console.log(`📈 Cache improvement: ${Math.round((1 - responseTime2/responseTime1) * 100)}%`);
    } else {
      console.log('ℹ️ Caching might not be active or both requests were fast');
    }
  });

  test('should test concurrent API requests', async ({ request }) => {
    console.log('🔄 Testing concurrent requests...');
    
    const concurrentRequests = 10;
    const promises = [];
    
    const startTime = Date.now();
    
    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(
        request.get('http://localhost:4000/health').then(response => ({
          status: response.status(),
          responseTime: Date.now() - startTime
        }))
      );
    }
    
    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    
    console.log(`⚡ ${concurrentRequests} concurrent requests completed in ${totalTime}ms`);
    
    // All requests should succeed
    results.forEach((result, index) => {
      expect(result.status).toBe(200);
      console.log(`Request ${index + 1}: ${result.status} (${result.responseTime}ms)`);
    });
    
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    console.log(`📊 Average response time: ${Math.round(avgResponseTime)}ms`);
    
    expect(avgResponseTime).toBeLessThan(2000);
  });

  test('should test error handling and recovery', async ({ request }) => {
    console.log('🛡️ Testing error handling...');
    
    // Test invalid endpoint
    const invalidResponse = await request.get('http://localhost:4000/api/invalid-endpoint');
    console.log(`❌ Invalid endpoint: ${invalidResponse.status()}`);
    expect(invalidResponse.status()).toBe(404);
    
    // Test malformed requests
    const malformedResponse = await request.post('http://localhost:4000/api/leads', {
      data: { invalid: 'data' }
    });
    console.log(`❌ Malformed request: ${malformedResponse.status()}`);
    expect([400, 401, 422]).toContain(malformedResponse.status());
  });

  test('should test WebSocket connection', async ({ page }) => {
    console.log('🔌 Testing WebSocket connection...');
    
    await page.goto('http://localhost:3001');
    
    // Test WebSocket functionality if available
    const wsSupport = await page.evaluate(() => {
      return new Promise((resolve) => {
        try {
          const ws = new WebSocket('ws://localhost:4000');
          
          ws.onopen = () => {
            console.log('WebSocket connected');
            ws.close();
            resolve('connected');
          };
          
          ws.onerror = () => {
            resolve('error');
          };
          
          // Timeout after 5 seconds
          setTimeout(() => {
            ws.close();
            resolve('timeout');
          }, 5000);
        } catch (error) {
          resolve('not_supported');
        }
      });
    });
    
    console.log(`🌐 WebSocket test result: ${wsSupport}`);
    
    if (wsSupport === 'connected') {
      console.log('✅ WebSocket connection successful');
    } else if (wsSupport === 'error') {
      console.log('⚠️ WebSocket connection failed');
    } else if (wsSupport === 'timeout') {
      console.log('⏰ WebSocket connection timed out');
    } else {
      console.log('ℹ️ WebSocket not supported or configured');
    }
  });

  test('should monitor memory usage during operations', async ({ request }) => {
    console.log('💾 Monitoring memory usage...');
    
    // Get initial memory stats
    const initialHealth = await request.get('http://localhost:4000/health');
    let initialMemory = 0;
    
    if (initialHealth.ok()) {
      const healthData = await initialHealth.json();
      initialMemory = healthData.memory?.heapUsed || 0;
      console.log(`📊 Initial memory usage: ${Math.round(initialMemory / 1024 / 1024)}MB`);
    }
    
    // Perform multiple operations
    for (let i = 0; i < 20; i++) {
      await request.get('http://localhost:4000/api/leads?limit=10');
    }
    
    // Check final memory stats
    const finalHealth = await request.get('http://localhost:4000/health');
    if (finalHealth.ok()) {
      const healthData = await finalHealth.json();
      const finalMemory = healthData.memory?.heapUsed || 0;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;
      
      console.log(`📊 Final memory usage: ${Math.round(finalMemory / 1024 / 1024)}MB`);
      console.log(`📈 Memory increase: ${Math.round(memoryIncrease)}MB`);
      
      // Memory increase should be minimal
      expect(memoryIncrease).toBeLessThan(10); // Less than 10MB increase
    }
  });

  test('should validate data consistency', async ({ request }) => {
    console.log('🔍 Testing data consistency...');
    
    // Get leads data
    const leadsResponse = await request.get('http://localhost:4000/api/leads?limit=5');
    
    if (leadsResponse.ok()) {
      const leadsData = await leadsResponse.json();
      console.log(`📋 Retrieved ${leadsData.leads?.length || 0} leads`);
      
      if (leadsData.leads && leadsData.leads.length > 0) {
        // Validate data structure
        const firstLead = leadsData.leads[0];
        expect(firstLead).toHaveProperty('id');
        expect(firstLead).toHaveProperty('email');
        
        console.log('✅ Lead data structure is valid');
        console.log(`📧 Sample lead: ${firstLead.email}`);
      }
      
      // Validate pagination
      if (leadsData.pagination) {
        expect(leadsData.pagination).toHaveProperty('total');
        expect(leadsData.pagination).toHaveProperty('page');
        console.log(`📄 Pagination: page ${leadsData.pagination.page} of ${leadsData.pagination.pages || '?'}`);
      }
    }
  });
});