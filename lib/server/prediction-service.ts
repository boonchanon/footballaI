// prediction-service (prediction-service/ in this repo) runs the ml/ code on the same machine as
// the website and listens on localhost only, so the browser never calls it directly.
export const PREDICTION_SERVICE_URL = (process.env.PREDICTION_SERVICE_URL?.trim() || "http://127.0.0.1:8000").replace(/\/+$/, "")
