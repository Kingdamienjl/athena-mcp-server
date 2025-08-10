const os = require('os');

/**
 * Get CPU statistics and system information
 * @returns {Object} CPU and system stats
 */
function getCpuStats() {
  const cpus = os.cpus();
  const loadAvg = os.loadavg();
  
  // Calculate CPU usage
  let totalIdle = 0;
  let totalTick = 0;
  
  cpus.forEach(cpu => {
    for (type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });
  
  const idle = totalIdle / cpus.length;
  const total = totalTick / cpus.length;
  const usage = 100 - ~~(100 * idle / total);
  
  return {
    cpuCount: cpus.length,
    cpuModel: cpus[0].model,
    cpuSpeed: cpus[0].speed,
    cpuUsage: usage,
    loadAverage: {
      '1min': loadAvg[0],
      '5min': loadAvg[1],
      '15min': loadAvg[2]
    },
    totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100, // GB
    freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024 * 100) / 100, // GB
    uptime: Math.round(os.uptime() / 3600 * 100) / 100, // hours
    platform: os.platform(),
    architecture: os.arch(),
    hostname: os.hostname()
  };
}

module.exports = { getCpuStats };