# Seller Analytics API Documentation

This document describes the analytics endpoints implemented for the seller dashboard, providing comprehensive insights into sales performance, product views, and business metrics.

## Overview

The analytics API provides sellers with detailed insights into their business performance, including:
- Revenue tracking and trends
- Product view analytics
- Sales performance metrics
- Conversion rate analysis
- Recent sales data

## Base URL

All analytics endpoints are prefixed with `/api/seller/analytics/`

## Authentication

All endpoints require authentication with a valid JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Analytics Summary

**GET** `/api/seller/analytics/summary`

Returns a comprehensive summary of the seller's analytics data.

#### Response
```json
{
  "todayRevenue": 450000,
  "revenueChange": 12.3,
  "totalSales": 25,
  "totalViews": 12332,
  "conversionRate": 2.8
}
```

#### Fields
- `todayRevenue`: Today's total revenue in Naira
- `revenueChange`: Percentage change in revenue compared to yesterday
- `totalSales`: Total number of completed sales
- `totalViews`: Total number of product views
- `conversionRate`: Conversion rate percentage (sales/views * 100)

---

### 2. Revenue Analytics

**GET** `/api/seller/analytics/revenue?period=week`

Returns revenue data over time for chart visualization.

#### Query Parameters
- `period` (optional): Time period for data aggregation
  - `week` (default): Last 7 days, grouped by day
  - `month`: Last 30 days, grouped by week
  - `year`: Last 12 months, grouped by month

#### Response
```json
[
  {
    "label": "2023-11-27",
    "value": 350000
  },
  {
    "label": "2023-11-28",
    "value": 380000
  },
  {
    "label": "2023-11-29",
    "value": 400000
  }
]
```

---

### 3. Views Analytics

**GET** `/api/seller/analytics/views?period=week`

Returns product views data over time for chart visualization.

#### Query Parameters
- `period` (optional): Time period for data aggregation
  - `week` (default): Last 7 days, grouped by day
  - `month`: Last 30 days, grouped by week
  - `year`: Last 12 months, grouped by month

#### Response
```json
[
  {
    "label": "2023-11-27",
    "value": 900
  },
  {
    "label": "2023-11-28",
    "value": 950
  },
  {
    "label": "2023-11-29",
    "value": 980
  }
]
```

---

### 4. Recent Sales

**GET** `/api/seller/analytics/recent-sales?limit=10`

Returns recent sales data for the seller's products.

#### Query Parameters
- `limit` (optional): Number of recent sales to retrieve (default: 10)

#### Response
```json
[
  {
    "key": "1",
    "item": "Persian Cat",
    "price": 80000,
    "date": "2023-11-29",
    "buyer": "sarah.smith@example.com"
  },
  {
    "key": "2",
    "item": "Golden Retriever",
    "price": 120000,
    "date": "2023-11-28",
    "buyer": "mike.johnson@example.com"
  }
]
```

---

### 5. Product Performance

**GET** `/api/seller/analytics/product-performance`

Returns performance metrics for all seller's products.

#### Response
```json
[
  {
    "id": 1,
    "title": "Persian Cat",
    "price": 80000,
    "category": "cat",
    "views": 150,
    "sales": 3,
    "conversionRate": 2.0
  },
  {
    "id": 2,
    "title": "Golden Retriever",
    "price": 120000,
    "category": "dog",
    "views": 200,
    "sales": 5,
    "conversionRate": 2.5
  }
]
```

---

## Product View Tracking

### Track Product View

**POST** `/api/products/{id}/view`

Tracks when a product is viewed for analytics purposes.

#### Path Parameters
- `id`: Product ID

#### Response
```json
{
  "message": "View tracked successfully"
}
```

---

## Database Schema

### ProductView Table
```sql
CREATE TABLE "ProductView" (
  "id" SERIAL PRIMARY KEY,
  "productId" INTEGER NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE
);

CREATE INDEX "ProductView_productId_idx" ON "ProductView"("productId");
CREATE INDEX "ProductView_createdAt_idx" ON "ProductView"("createdAt");
```

### OrderProduct Table (Updated)
```sql
ALTER TABLE "OrderProduct" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "OrderProduct" ADD COLUMN "price" DOUBLE PRECISION NOT NULL;
```

---

## Error Responses

All endpoints may return the following error responses:

### 401 Unauthorized
```json
{
  "message": "Not authenticated"
}
```

### 403 Forbidden
```json
{
  "message": "Not authorized as a seller"
}
```

### 500 Internal Server Error
```json
{
  "message": "Error message",
  "error": "Detailed error information"
}
```

---

## Usage Examples

### Frontend Integration

```javascript
// Get analytics summary
const summary = await fetch('/api/seller/analytics/summary', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Get revenue data for charts
const revenueData = await fetch('/api/seller/analytics/revenue?period=month', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Track product view
await fetch(`/api/products/${productId}/view`, {
  method: 'POST'
});
```

### React Hook Example

```javascript
import { useState, useEffect } from 'react';

const useAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/seller/analytics/summary', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        setAnalytics(data);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  return { analytics, loading };
};
```

---

## Testing

Run the test script to verify analytics functionality:

```bash
cd server
node test-analytics.js
```

This will create sample data and test all analytics queries.

---

## Notes

1. **View Tracking**: Product views are tracked automatically when the `/api/products/{id}/view` endpoint is called. This should be called whenever a product page is viewed.

2. **Data Aggregation**: Revenue and views data is aggregated by time periods (day, week, month) for efficient querying and chart display.

3. **Performance**: All analytics queries are optimized with proper database indexes for fast retrieval.

4. **Real-time Data**: Analytics data is calculated in real-time from the database, ensuring accuracy.

5. **Security**: All endpoints require seller authentication and only return data for the authenticated seller's products. 