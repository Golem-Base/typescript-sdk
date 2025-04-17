run-dev.sh

go run ./cmd/golembase account create
# Give funds to test account?
go run ./cmd/golembase account fund
# Create entity in golem-base
go run ./cmd/golembase entity create --data

query-mongo.sh
query-sqlite.sh
