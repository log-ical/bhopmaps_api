## Routes

| Method | Route|
|--------|--------|
| @POST| `/api/register`|
| @POST| `/api/login`|
| @GET |`/api/user`|
| @GET |`/api/:username`|
| @POST| `/api/logout`|
| @PUT |`/api/user/edit`|
| @DELETE| `/api/user/delete`|
| @POST| `/api/map/new`|
| @POST| `/api/map/delete`|
| @GET| `/api/maps`|




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