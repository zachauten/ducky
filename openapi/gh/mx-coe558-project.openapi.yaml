swagger: "2.0"
info:
  title: coe558-unified-api
  description: Single API front for Weather, GenAI & CRUD
  version: 1.0.0

host: ${service_control}
schemes:
  - https

x-google-endpoints:
  - name: ${service_control}
    allowCors: true

paths:
  /weather:
    get:
      summary: Current weather (REST)
      operationId: getWeather
      parameters:
        - name: lat
          in: query
          required: false
          type: number
          description: Latitude of the location (required if city is not provided)
        - name: lon
          in: query
          required: false
          type: number
          description: Longitude of the location (required if city is not provided)
        - name: city
          in: query
          required: false
          type: string
          description: City name for weather lookup (alternative to lat/lon)
      responses:
        "200":
          description: OK
          schema:
            type: object
            properties:
              latitude:
                type: number
                description: Latitude of the location
              longitude:
                type: number
                description: Longitude of the location
              city:
                type: string
                description: City name (if provided in query)
              temperature:
                type: number
                description: Current temperature in degrees Celsius
              windspeed:
                type: number
                description: Wind speed in km/h
              winddirection:
                type: number
                description: Wind direction in degrees
              weathercode:
                type: number
                description: Weather condition code
        "400":
          description: Bad Request
          schema:
            type: object
            properties:
              error:
                type: string
                description: Error message
        "404":
          description: Not Found
          schema:
            type: object
            properties:
              error:
                type: string
                description: Error message
        "500":
          description: Internal Server Error
          schema:
            type: object
            properties:
              error:
                type: string
                description: Error message
      x-google-backend:
        address: ${weather_backend_url}
        protocol: h2

    post:
      summary: Current weather (GraphQL)
      operationId: getWeatherGraphQL
      consumes:
        - application/json
      produces:
        - application/json
      parameters:
        - in: body
          name: body
          required: true
          schema:
            type: object
            properties:
              query:
                type: string
                description: GraphQL query string
              variables:
                type: object
                description: GraphQL variables
      responses:
        "200":
          description: OK
          schema:
            type: object
        "400":
          description: Bad Request
          schema:
            type: object
            properties:
              error:
                type: string
                description: Error message
        "500":
          description: Internal Server Error
          schema:
            type: object
            properties:
              error:
                type: string
                description: Error message
      x-google-backend:
        address: ${weather_backend_url}/graphql
        protocol: h2

  /generate:
    post:
      summary: Generate an image
      operationId: genImage
      consumes:
        - application/json
      produces:
        - application/json
      parameters:
        - in: body
          name: body
          required: true
          schema:
            type: object
            properties:
              prompt:
                type: string
      responses:
        "200":
          description: OK
          schema:
            type: object
      x-google-backend:
        address: ${genai_backend_url}
        protocol: h2

  /items:
    get:
      summary: List saved items
      operationId: listItems
      responses:
        "200":
          description: OK
          schema:
            type: array
            items:
              type: object
      x-google-backend:
        address: ${crud_backend_url}/items
        protocol: h2

    post:
      summary: Save an item
      operationId: saveItem
      consumes:
        - application/json
      parameters:
        - in: body
          name: body
          required: true
          schema:
            type: object
            properties:
              prompt:
                type: string
              resultUrl:
                type: string
      responses:
        "200":
          description: OK
          schema:
            type: object
      x-google-backend:
        address: ${crud_backend_url}/items
        protocol: h2

  /items/{id}:
    parameters:
      - name: id
        in: path
        required: true
        type: string
    get:
      summary: Get an item by ID
      operationId: getItem
      responses:
        "200":
          description: OK
          schema:
            type: object
      x-google-backend:
        address: ${crud_backend_url}/items/{id}
        protocol: h2

    put:
      summary: Update an item
      operationId: updateItem
      consumes:
        - application/json
      parameters:
        - name: id
          in: path
          required: true
          type: string
        - in: body
          name: body
          required: true
          schema:
            type: object
            properties:
              prompt:
                type: string
              resultUrl:
                type: string
      responses:
        "200":
          description: OK
          schema:
            type: object
      x-google-backend:
        address: ${crud_backend_url}/items/{id}
        protocol: h2

    delete:
      summary: Delete an item
      operationId: deleteItem
      responses:
        "204":
          description: No Content
      x-google-backend:
        address: ${crud_backend_url}/items/{id}
        protocol: h2

  /graphql:
    post:
      summary: GraphQL endpoint for CRUD service
      operationId: graphqlCrud
      x-google-backend:
        address: ${crud_backend_url}/graphql
      responses:
        '200':
          description: A successful response