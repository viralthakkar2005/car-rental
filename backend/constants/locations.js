// Placeholder dealer branch locations. This is a plain array (not a hard
// Mongoose enum) so it can be edited here without a schema migration —
// swap these for your real branch names/cities whenever you're ready.
export const LOCATIONS = [
  "New York, NY",
  "Los Angeles, CA",
  "Chicago, IL",
  "Houston, TX",
  "Miami, FL",
  "San Francisco, CA",
];

export const isValidLocation = (value) => LOCATIONS.includes(value);