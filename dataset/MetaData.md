# Dataset Description
The dataset used in this project is a synthetic B2B sales lead dataset designed for training and evaluating a machine learning model for predictive lead scoring and sales automation.

The dataset simulates real-world customer relationship management (CRM) and sales engagement data commonly used by organizations to analyze lead quality, predict conversion probability, and improve sales decision-making.

The dataset is structured for supervised machine learning classification using the **Random Forest Classifier** algorithm.

---

## Dataset Purpose
The dataset was created to support:
- Predictive lead scoring
- Customer conversion prediction
- Sales automation workflows
- Lead prioritization
- CRM analytics
- Machine learning model training and evaluation
The dataset enables the system to learn patterns between lead behavior and conversion outcomes.


## Dataset Characteristics
| Property | Value |
|---|---|
| Dataset Type | Synthetic B2B Sales Lead Dataset |
| Learning Type | Supervised Machine Learning |
| Machine Learning Task | Binary Classification |
| Number of Records | 5,000 |
| Number of Features | 28 |
| Target Variable | converted |
| File Format | CSV |
| Intended Algorithm | Random Forest Classifier |

## Target Variable
The target label used for prediction is:
| Column | Description |
|---|---|
| converted | Indicates whether a lead converted into a customer |

## Target Values
| Value | Meaning |
|---|---|
| 1 | Converted Customer |
| 0 | Not Converted |

The machine learning model learns relationships between lead attributes and this target variable.


## Dataset Metadata

### Lead Information Features
| Column Name | Data Type | Description |
|---|---|---|
| lead_id | VARCHAR | Unique identifier assigned to each lead |
| first_name | VARCHAR | Lead's first name |
| last_name | VARCHAR | Lead's last name |
| email | VARCHAR | Business email address of the lead |
| phone_number | VARCHAR | Contact phone number using Nigerian format (+234 xxx xxx xxxx) |


### Professional & Organizational Features
| Column Name | Data Type | Description |
|---|---|---|
| job_title | VARCHAR | Professional role or job position of the lead |
| seniority_level | ENUM | Organizational level of the lead (C-Suite, VP, Director, Manager, Staff) |
| department | VARCHAR | Department within the organization |
| country | VARCHAR | Country or geographical region of the lead |
| company_name | VARCHAR | Name of the organization |
| company_industry | ENUM | Industry sector of the company |
| company_size_category | ENUM | Company classification (Startup, SMB, Mid-Market, Enterprise) |
| company_size_range | VARCHAR | Estimated employee size range of the organization |
| estimated_annual_revenue | FLOAT | Estimated yearly company revenue(Million) |


### Lead Acquisition Features
| Column Name | Data Type | Description |
|---|---|---|
| lead_source | ENUM | Source through which the lead was acquired |
| date_captured | DATE | Date the lead entered the system |


### Behavioral & Engagement Features
| Column Name | Data Type | Description |
|---|---|---|
| website_visits | INTEGER | Total number of visits to the company website |
| pages_viewed | INTEGER | Number of website pages viewed by the lead |
| average_time_on_site | FLOAT | Average session duration spent on the website in minutes |
| email_open_rate | FLOAT | Percentage of marketing emails opened by the lead |
| email_click_rate | FLOAT | Percentage of clicked email links |
| webinar_attendance | BOOLEAN | Indicates whether the lead attended a webinar |
| last_interaction_days | INTEGER | Number of days since the last interaction |
| meeting_scheduled | BOOLEAN | Indicates whether a sales meeting was scheduled |
| follow_up_status | ENUM | Lead response after sales follow-up (Positive, Neutral, Negative, No Response) |


### Financial & Purchase Intent Features
| Column Name | Data Type | Description |
|---|---|---|
| estimated_budget | ENUM | Estimated purchasing budget level (Low, Medium, High) |
| purchase_timeline | ENUM | Expected timeframe within which the lead intends to make a purchasing decision |


## Dataset Value Categories
### Seniority Levels
- C-Suite
- VP
- Director
- Manager
- Staff

### Company Size Categories
- Startup
- SMB
- Mid-Market
- Enterprise

### Lead Sources
- LinkedIn
- Webinar
- Referral
- Cold Email
- Website
- Paid Ads
- Events

### Follow-Up Status Values
- Positive
- Neutral
- Negative
- No Response

### Estimated Budget Values
- Low
- Medium
- High

### Purchase Timeline Values
- Immediate
- 1-3 Months
- 3-6 Months
- Future

### Dataset Distribution
The dataset follows a realistic business conversion distribution.

| Conversion Class | Approximate Distribution |
|---|---|
| Converted Leads | 30–40% |
| Non-Converted Leads | 60–70% |
This distribution helps improve realism and supports effective machine learning training.

### Machine Learning Relevance
The dataset includes features commonly associated with lead conversion behavior, including:
- Customer engagement metrics
- Website interaction patterns
- Email engagement behavior
- Organizational characteristics
- Purchase intent indicators
- Budget estimation
- Follow-up responses
These features enable the machine learning model to identify conversion patterns and generate predictive lead scores.

### Data Quality Characteristics
The dataset was generated with the following quality considerations:
- No duplicate lead IDs
- No missing values
- Realistic business relationships between features
- Balanced behavioral variation
- Consistent categorical formatting
- Machine-learning-ready structure

### Summary
The dataset serves as the foundational component of the predictive lead scoring system by providing structured lead information, engagement behavior, organizational attributes, and conversion outcomes required for machine learning model training and evaluation.
