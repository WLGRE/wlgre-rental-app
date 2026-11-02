-- The unit the applicant chose in the application's dropdown (src/properties.js), e.g. 831 Willow Pointe Dr.
-- Null on applications submitted before the dropdown existed.
alter table applications add column property_address text;
