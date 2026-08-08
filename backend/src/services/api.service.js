const axios = require("axios")
const { apiConfig } = require("../config/api.config")
const { ApiError } = require("../utils/api-error")
const logger = require("../utils/logger")

const apiClient = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
  headers: {
    "Content-Type": "application/json",
  },
  params: {
    api_key: apiConfig.apiKey,
  },
})

async function request(method, path, options = {}) {
  try {
    const response = await apiClient.request({
      url: path,
      method,
      ...options,
    })

    if (!response.data) {
      throw new ApiError(502, "No data returned from AllSportsAPI")
    }

    if (response.data.result === 0 && response.data.error) {
      throw new ApiError(502, response.data.error)
    }

    return response.data
  } catch (error) {
    logger.error("AllSportsAPI request failed %s %s %o", method, path, error.message || error)
    if (error.response) {
      const message = error.response.data?.error || error.response.statusText
      throw new ApiError(error.response.status, message)
    }
    if (error instanceof ApiError) {
      throw error
    }
    if (error.code === "ECONNABORTED") {
      throw new ApiError(504, "AllSportsAPI request timed out")
    }
    throw new ApiError(502, error.message || "Unknown API error")
  }
}

module.exports = { apiClient, request }
