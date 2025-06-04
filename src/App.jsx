import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import * as chrono from 'chrono-node';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line } from 'recharts';

const App = () => {
  const [selectedTopic, setSelectedTopic] = useState('covid19');
  const [data, setData] = useState([]);
  const [displayData, setDisplayData] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const topics = [
    { value: 'covid19', label: 'Covid 19' },
    { value: 'crypto', label: 'Crypto' },
    { value: 'bitcoin', label: 'Bitcoin' },
    { value: 'ukraine', label: 'Ukraine' },
    { value: 'travel', label: 'Travel' },
    { value: 'mondaymotivation', label: 'Monday Motivation' },
    { value: 'christmas', label: 'Christmas' },
    { value: 'iran', label: 'Iran' },
    { value: 'realestate', label: 'Real Estate' },
  ];

  useEffect(() => {
    fetch('/Hashtag_sum_2_10.csv')
      .then(response => response.text())
      .then(csv => {
        Papa.parse(csv, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: false,
          transformHeader: header => header.trim().replace(/^"|"$/g, ''),
          transform: (value, header) => value.trim().replace(/^"|"$/g, ''),
          complete: results => {
            const cleanedData = processAndCleanData(results.data);
            setData(cleanedData);
            setDisplayData(cleanedData);
            setIsLoading(false);
          },
          error: err => {
            console.error('Lỗi khi phân tích CSV:', err);
            setError('Không thể tải dữ liệu');
            setIsLoading(false);
          },
        });
      })
      .catch(err => {
        console.error('Lỗi khi tải CSV:', err);
        setError('Không thể tải dữ liệu');
        setIsLoading(false);
      });
  }, []);

  const processAndCleanData = rawData => {
    return rawData
      .filter(row => row['date'] && row['date'].trim() !== '')
      .map(row => {
        const date = chrono.parseDate(row['date']);
        return {
          date: date instanceof Date && !isNaN(date) ? date : null,
          covid19: parseInt(row['covid19']) || 0,
          crypto: parseInt(row['crypto']) || 0,
          bitcoin: parseInt(row['bitcoin']) || 0,
          ukraine: parseInt(row['ukraine']) || 0,
          travel: parseInt(row['travel']) || 0,
          mondaymotivation: parseInt(row['mondaymotivation']) || 0,
          christmas: parseInt(row['christmas']) || 0,
          iran: parseInt(row['iran']) || 0,
          realestate: parseInt(row['realestate']) || 0,
        };
      })
      .filter(row => row.date !== null)
      .sort((a, b) => a.date - b.date);
  };

  const predictFutureValues = async horizon => {
    try {
      const payload = {
        data: data.map(item => ({
          ds: item.date.toISOString().split('T')[0],
          y: item[selectedTopic],
        })),
        horizon,
      };

      const response = await fetch('/.netlify/functions/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Lỗi khi gọi API dự đoán');

      const predictions = await response.json();
      const predictedValues = predictions.map((pred, index) => {
        const futureDate = new Date(data[data.length - 1].date);
        futureDate.setDate(futureDate.getDate() + index + 1);
        return {
          date: futureDate.toLocaleDateString('vi-VN'),
          value: Math.max(0, Math.round(pred.yhat)),
        };
      });

      setPredictions(predictedValues);
      setError(null);
    } catch (err) {
      console.error('Lỗi dự đoán:', err);
      setError('Không thể thực hiện dự đoán');
    }
  };

  const handleExplore = () => {
    setDisplayData(data);
    setPredictions([]);
    setError(null);
  };

  if (isLoading) {
    return <div className="text-center text-xl mt-10">Đang tải dữ liệu...</div>;
  }

  if (error) {
    return <div className="text-center text-xl mt-10 text-red-500">{error}</div>;
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row items-center justify-center mb-8">
        <h1 className="text-3xl font-bold mr-4 mb-4 md:mb-0">
          Hãy chọn chủ đề bạn muốn quan sát
        </h1>
        <div className="flex items-center">
          <select
            className="border rounded-full p-2 mr-2 focus:outline-none"
            value={selectedTopic}
            onChange={e => setSelectedTopic(e.target.value)}
          >
            {topics.map(topic => (
              <option key={topic.value} value={topic.value}>
                {topic.label}
              </option>
            ))}
          </select>
          <button
            className="bg-blue-500 text-white rounded-full px-6 py-2 hover:bg-blue-600 transition"
            onClick={handleExplore}
          >
            Khám phá
          </button>
        </div>
      </div>

      {displayData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">
            Mức độ quan tâm theo thời gian
          </h2>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={displayData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={date => date.toLocaleDateString('vi-VN')}
                interval="preserveStartEnd"
              />
              <YAxis label={{ value: 'Số lượng', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                labelFormatter={date => new Date(date).toLocaleDateString('vi-VN')}
              />
              <Line
                type="monotone"
                dataKey={selectedTopic}
                stroke="#3B82F6"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>

          <div className="flex justify-center mt-4 space-x-4">
            <button
              className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
              onClick={() => predictFutureValues(1)}
            >
              Dự đoán 1 ngày
            </button>
            <button
              className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
              onClick={() => predictFutureValues(5)}
            >
              Dự đoán 5 ngày
            </button>
            <button
              className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
              onClick={() => predictFutureValues(10)}
            >
              Dự đoán 10 ngày
            </button>
          </div>

          {predictions.length > 0 && (
            <div className="mt-4 text-center">
              <h3 className="text-lg font-semibold">Kết quả dự đoán:</h3>
              <p>
                {predictions.map(pred => (
                  <span key={pred.date}>
                    {pred.date}: {pred.value}
                    {pred !== predictions[predictions.length - 1] ? ', ' : ''}
                  </span>
                ))}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
