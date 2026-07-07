export const handler = async () => {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Functions are working!", timestamp: new Date().toISOString() })
  };
};
