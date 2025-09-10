const { spawn } = require('child_process');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { toLocalTimestamp } = require('../utils/dateUtils.cjs');

class ProcessManagerService {
  constructor() {
    this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    this.cronProcess = null;
    this.isStartingCron = false;
    this.cronRestartAttempts = 0;
    this.maxRestartAttempts = 3;
  }

  /**
   * Start the cron processor automatically
   */
  async startCronProcessor() {
    if (this.isStartingCron) {
      console.log('⏳ Cron processor already starting...');
      return { success: false, message: 'Cron processor startup already in progress' };
    }

    if (this.cronProcess && !this.cronProcess.killed) {
      console.log('✅ Cron processor already running');
      return { success: true, message: 'Cron processor already running' };
    }

    this.isStartingCron = true;
    this.cronRestartAttempts++;

    if (this.cronRestartAttempts > this.maxRestartAttempts) {
      console.log(`❌ Max restart attempts (${this.maxRestartAttempts}) exceeded`);
      this.isStartingCron = false;
      return { success: false, message: 'Max restart attempts exceeded' };
    }

    try {
      console.log('🚀 Starting cron processor automatically...');
      
      // Get the path to the cron script
      const cronScriptPath = path.join(__dirname, '../cron.js');
      
      // Spawn the cron process
      this.cronProcess = spawn('node', [cronScriptPath], {
        cwd: path.join(__dirname, '../../'),
        env: { ...process.env },
        stdio: 'pipe' // Capture output
      });

      // Log cron output with prefix
      this.cronProcess.stdout.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          console.log(`[CRON] ${output}`);
        }
      });

      this.cronProcess.stderr.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          console.error(`[CRON ERROR] ${output}`);
        }
      });

      // Handle process exit
      this.cronProcess.on('exit', (code, signal) => {
        console.log(`[CRON] Process exited with code ${code}, signal: ${signal}`);
        this.cronProcess = null;
        
        if (code !== 0 && this.cronRestartAttempts < this.maxRestartAttempts) {
          console.log('🔄 Cron process crashed, attempting restart in 5 seconds...');
          setTimeout(() => {
            this.isStartingCron = false;
            this.startCronProcessor();
          }, 5000);
        }
      });

      this.cronProcess.on('error', (error) => {
        console.error('❌ Failed to start cron processor:', error);
        this.cronProcess = null;
        this.isStartingCron = false;
      });

      // Wait a moment for the process to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      this.isStartingCron = false;
      
      if (this.cronProcess && !this.cronProcess.killed) {
        console.log('✅ Cron processor started successfully');
        
        // Log the automatic startup
        await this.logProcessEvent('cron_processor', 'auto_started', {
          pid: this.cronProcess.pid,
          attempt: this.cronRestartAttempts
        });
        
        return { success: true, message: 'Cron processor started successfully', pid: this.cronProcess.pid };
      } else {
        console.log('❌ Cron processor failed to start');
        return { success: false, message: 'Cron processor failed to start' };
      }

    } catch (error) {
      console.error('❌ Error starting cron processor:', error);
      this.isStartingCron = false;
      return { success: false, message: `Failed to start cron processor: ${error.message}` };
    }
  }

  /**
   * Check if cron processor is running
   */
  isCronProcessorRunning() {
    return this.cronProcess && !this.cronProcess.killed;
  }

  /**
   * Stop the cron processor
   */
  async stopCronProcessor() {
    if (this.cronProcess && !this.cronProcess.killed) {
      console.log('🛑 Stopping cron processor...');
      
      // Log the shutdown
      await this.logProcessEvent('cron_processor', 'stopped', {
        pid: this.cronProcess.pid
      });
      
      this.cronProcess.kill('SIGTERM');
      
      // Wait for graceful shutdown
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          if (this.cronProcess && !this.cronProcess.killed) {
            console.log('⚡ Force killing cron processor...');
            this.cronProcess.kill('SIGKILL');
          }
          resolve({ success: true, message: 'Cron processor stopped (forced)' });
        }, 10000); // 10 second timeout

        this.cronProcess.on('exit', () => {
          clearTimeout(timeout);
          this.cronProcess = null;
          console.log('✅ Cron processor stopped gracefully');
          resolve({ success: true, message: 'Cron processor stopped gracefully' });
        });
      });
    }
    
    return { success: true, message: 'Cron processor was not running' };
  }

  /**
   * Get cron processor status
   */
  getCronProcessorStatus() {
    return {
      running: this.isCronProcessorRunning(),
      pid: this.cronProcess?.pid || null,
      startingUp: this.isStartingCron,
      restartAttempts: this.cronRestartAttempts
    };
  }

  /**
   * Log process events to database
   */
  async logProcessEvent(service, event, metadata = {}) {
    try {
      await this.supabase
        .from('process_events')
        .insert({
          service,
          event,
          metadata,
          timestamp: toLocalTimestamp()
        });
    } catch (error) {
      console.error('❌ Failed to log process event:', error);
    }
  }

  /**
   * Setup graceful shutdown for the main process
   */
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`🛑 Received ${signal}, shutting down process manager...`);
      await this.stopCronProcessor();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('uncaughtException', async (error) => {
      console.error('💥 Uncaught exception:', error);
      await this.stopCronProcessor();
      process.exit(1);
    });
  }
}

module.exports = ProcessManagerService;