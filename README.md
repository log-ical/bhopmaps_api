## Routes

| Method | Route| Description |
|--------|--------|
| @POST| `/api/register`| Registers a user|
| @POST| `/api/login`| Logs a user in with JWT |
| @GET |`/api/user`| Fetches user information with JWT |
| @GET |`/api/:username`| Fetches a user information per username |
| @POST| `/api/logout`| Clears cookie|
| @PUT |`/api/user/edit`| Edits username or avatar |
| @DELETE| `/api/user/delete`| Deletes a user and their uploaded maps |
| @POST| `/api/map/new`| Creates a new map |
| @POST| `/api/map/delete`| Deletes a map |
| @GET| `/api/maps`| Fetches all maps from database |




## env.example
```
DB_HOST=localhost
DB_USER=root
DB_PW=
DB_NAME=bhopmaps
JWT_SECRET=
ORIGIN_URL=http://localhost:3000

S3_ACCESS=
S3_SECRET=
S3_REGION=
S3_BUCKET=
```