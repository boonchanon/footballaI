// eslint-disable-next-line @typescript-eslint/no-require-imports
export const footballService = require("../../../backend/src/services/football.service.js") as {
  getFixtures: (params?: Record<string, unknown>) => Promise<any[]>
  getStandings: () => Promise<any[]>
  getTeams: () => Promise<any[]>
  getPlayerStatsSummary: () => Promise<any>
  getPlayerDetails: (id: string) => Promise<any>
  getFixturePrediction: (id: string) => Promise<any>
}
