##Methods

#### jqrouter.go(URL,[queryData],[postData])
Changes the browser url to URL

```javascript
var router = module("jqrouter");
router.go("/some/path/prince/no/details", { id : "30" });
````
*  **Note :- To change just hash, start url with #**;



#### jqrouter.post(URL,[postData],[queryData])
Changes the browser url to URL

```javascript
//Or  post method
router.post("/some/path/prince/no/details", { id : "30" });

```

#### jqrouter.on(URLMatch,callback)
Subscribe to URL change
```javascript
router.on("/some/path/{someVar}/no/{otherVar}", function(e,target,queryParams,postParams){

    //We can read param values
    e.params.someVar
    e.params.otherVar
    
    //Query params map
    queryParams

    //Post params map
    postParams
});
```

#### jqrouter.reload(URL)
reloads the the current url

#### jqrouter.getQueryParam(key)
returns value of query param

#### jqrouter.setQueryParam(key)
sets value of query param

#### jqrouter.setQueryParams(key)
sets value of query param

#### jqrouter.getQueryParams([defaultValues])
sets values of query params

#### jqrouter.getPostParam(key)
returns value of post param

#### jqrouter.getPostParams()
returns all post params

