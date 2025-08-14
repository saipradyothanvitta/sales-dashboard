from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import pandas as pd
import random
import os
from models import Sale

app = Flask(__name__)
CORS(app)
# NEW, BETTER CODE
import os
database_url = os.environ.get('DATABASE_URL')
if database_url:
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url.replace("postgres://", "postgresql://", 1)
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///instance/sales.db'
db = SQLAlchemy(app)
# ... after db = SQLAlchemy(app)
with app.app_context():
    db.create_all()

# --- 1. Database Model ---
class Sale(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.DateTime, nullable=False)
    company = db.Column(db.String(50), nullable=False)
    product = db.Column(db.String(50), nullable=False)
    region = db.Column(db.String(50), nullable=False)
    sales = db.Column(db.Integer, nullable=False)

    def to_dict(self):
        return {
            'date': self.date.strftime('%Y-%m-%d'),
            'company': self.company,
            'product': self.product,
            'region': self.region,
            'sales': self.sales
        }

# --- 2. Data Seeder Function ---
def seed_database():
    if os.path.exists('sales_data.db'):
        os.remove('sales_data.db')

    with app.app_context():
        db.create_all()
        products = ['Product A', 'Product B', 'Product C', 'Product D', 'Product E']
        regions = ['East', 'West', 'North', 'South']
        companies = ['Company X', 'Company Y', 'Company Z']
        
        start_date = datetime(2024, 1, 1)
        end_date = datetime(2025, 3, 31)
        dates = pd.date_range(start_date, end_date, freq='D')
        
        for date in dates:
            for company in companies:
                for _ in range(random.randint(1, 3)):
                    sale = Sale(
                        date=date,
                        company=company,
                        product=random.choice(products),
                        region=random.choice(regions),
                        sales=random.randint(500, 5000)
                    )
                    db.session.add(sale)
        db.session.commit()
        print("Database seeded with rich sample data for multiple companies.")

# --- 3. API Endpoints ---
@app.route('/api/companies', methods=['GET'])
def get_companies():
    """Returns a list of unique companies available in the data."""
    companies = db.session.query(Sale.company).distinct().all()
    return jsonify([c[0] for c in companies])

@app.route('/api/dashboard/<company_name>', methods=['GET'])
def get_dashboard_data(company_name):
    """
    Returns all aggregated data for a specific company and date range in a single response.
    Expects 'start_date' and 'end_date' as query parameters.
    """
    try:
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')

        if not all([start_date_str, end_date_str]):
            return jsonify({'error': 'start_date and end_date are required'}), 400

        start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d')

        sales_data = Sale.query.filter(
            Sale.company == company_name,
            Sale.date.between(start_date, end_date)
        ).order_by(Sale.date).all()
        
        if not sales_data:
            return jsonify({'message': 'No data for this company and date range'}), 404

        df = pd.DataFrame([s.to_dict() for s in sales_data])
        df['date'] = pd.to_datetime(df['date'])
        
        # --- Perform all the different analyses using pandas ---
        
        # New KPIs
        total_sales = int(df['sales'].sum())
        average_sales_per_transaction = round(df['sales'].mean(), 2)
        top_product = df.groupby('product')['sales'].sum().idxmax()
        
        # 1. Daily Sales Trend
        daily_sales = df.groupby(df['date'].dt.date)['sales'].sum().reset_index()
        daily_sales['date'] = daily_sales['date'].astype(str)
        
        # 2. Sales by Product Category
        category_sales = df.groupby('product')['sales'].sum().sort_values(ascending=False)
        
        # 3. Sales by Region
        region_sales = df.groupby('region')['sales'].sum()
        
        # 4. Sales by Day of the Week
        df['DayOfWeek'] = df['date'].dt.day_name()
        day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        day_sales = df.groupby('DayOfWeek')['sales'].sum().reindex(day_order)
        
        # --- Consolidate all data into a single JSON object ---
        return jsonify({
            'company_name': company_name,
            'total_sales': total_sales,
            'avg_sales_per_transaction': average_sales_per_transaction,
            'top_product': top_product,
            'daily_sales_trend': daily_sales.to_dict(orient='records'),
            'category_sales': category_sales.to_dict(),
            'region_sales': region_sales.to_dict(),
            'day_sales': day_sales.to_dict(),
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    seed_database()
    app.run(debug=True)
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)