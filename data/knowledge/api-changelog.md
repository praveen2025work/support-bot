# API Changelog

## v2.5.0 (2026-03-01)
- Added batch query execution endpoint POST /api/queries/batch
- Improved filter binding support: body, query_param, path variable
- New query types: url and file-based responses

## v2.4.0 (2026-02-15)
- Added query estimation endpoint GET /api/queries/:id/estimate
- Performance improvements for large result sets
- Fixed pagination bug in multi-query responses

## v2.3.0 (2026-01-20)
- Introduced filter configuration API
- Added boolean filter type support
- Admin dashboard improvements

## v2.2.0 (2025-12-10)
- Group-based query filtering by source
- Custom API base URL per group
- Widget embed code generator
