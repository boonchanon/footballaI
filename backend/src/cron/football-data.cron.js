const cron = require("node-cron")
const footballDataService = require("../services/football-data.service")

function startFootballDataCron() {
  cron.schedule("*/1 * * * *", async () => {
    try {
      console.log("[cron] refreshing live matches")
      await footballDataService.refreshLiveMatches()
    } catch (error) {
      console.error("[cron] failed to refresh live matches", error.message || error)
    }
  })

  cron.schedule("0,30 * * * *", async () => {
    try {
      console.log("[cron] refreshing standings")
      await footballDataService.refreshStandings()
    } catch (error) {
      console.error("[cron] failed to refresh standings", error.message || error)
    }
  })

  cron.schedule("0 */6 * * *", async () => {
    try {
      console.log("[cron] refreshing fixtures")
      await footballDataService.refreshFixtures()
    } catch (error) {
      console.error("[cron] failed to refresh fixtures", error.message || error)
    }
  })
}

module.exports = { startFootballDataCron }
