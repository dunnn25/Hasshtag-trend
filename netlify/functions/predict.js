exports.handler = async function (event, context) {
  try {
    const { data, horizon } = JSON.parse(event.body);
    if (!data || !Array.isArray(data) || !horizon || horizon < 1) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Dữ liệu không hợp lệ hoặc thiếu horizon' }),
      };
    }

    // Lấy 10 điểm dữ liệu gần nhất
    const recentData = data.slice(-10).map(item => parseFloat(item.y));
    if (recentData.length < 2) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Không đủ dữ liệu để dự đoán' }),
      };
    }

    // Tính hồi quy tuyến tính
    const n = recentData.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = recentData;
    const xMean = x.reduce((a, b) => a + b, 0) / n;
    const yMean = y.reduce((a, b) => a + b, 0) / n;
    let numerator = 0, denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (x[i] - xMean) * (y[i] - yMean);
      denominator += (x[i] - xMean) ** 2;
    }
    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = yMean - slope * xMean;

    // Tạo dự đoán
    const predictions = [];
    for (let i = 1; i <= horizon; i++) {
      const predictedValue = Math.max(0, Math.round(intercept + slope * (n + i - 1)));
      predictions.push({ ds: `day_${i}`, yhat: predictedValue });
    }

    return {
      statusCode: 200,
      body: JSON.stringify(predictions),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Lỗi khi dự đoán: ' + error.message }),
    };
  }
};
