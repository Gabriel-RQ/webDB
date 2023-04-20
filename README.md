# WebDB

WebDB is a simple and lightweight promise wrapper for IndexedDB, making it easier to work with.<br>

## Why?

IndexedDB can be a pain to work with, as it's a low level event based API.<br>
So, how to make it simple? Promises.<br>
Adding an asynchronous wrapper on top of IndexedDB using promises make it much easier and pleasant to use.

## How to install?

Just `npm i @gabrielrq/web-db` and start using.<br>

## Example (AKA Docs?)

```js
import { WebDB } from "@gabrielrq/web-db";

// set up
const db = new WebDB("database", 1, {
  // setting up our object stores
  objectStores: [
    {
      name: "cars_object_store",
      options: {
        autoIncrement: true,
        keyPath: "id",
      },
      configs: {
        // setting indexes for this object store
        indexes: [
          {
            name: "color",
            keyPath: "color",
          },
        ],
        // tells WebDB wether or not to recreate this object store each time the database gets updated (version change, for example)
        recreate: false, // default
      },
    },
  ],
  // event handlers
  {
    onBlocked: (oldversion, newVersion) => {
      consoloe.log("Database is blocked! Is it open on another tab?")
    },
    onVersionChange: (db, oldVersion, newVersion) => {
      // do stuff
    },
    onError: (error) => {
      console.error("An error occurred on the database!", error.message)
    }
  }
});

// get a transaction and mess your hands with direct access to indexedDB
const transaction = await db.transaction("cars_object_store");
const objectStore = transaction.objectStore("cars_object_store");

const request = objectStore.add({ color: "red", model: "Car Brand" });

request.onsuccess = () => console.log("Added!");
request.onerror = () => console.log("Oops! Not added :(");

// or use the utility to simple add...
const result = await db.add("cars_object_store", { color: "blue", model: "Car brand 2"});

if (result) console.log("Added! Key: ", result);
else console.log("Oops! Not addedd :(");
// and you can do the same for `put()`

// you can also need to `get()` or `getAll()` data...
const data = await db.get("cars_object_store", 1);

if (data) console.log("Car 1: ", data);

const allData = await db.getAll("cars_object_store");

if (allData) console.log("Cars: ", allData);

// You may also need to delete data...
db.delete("cars_object_store", 1)
.then(s => {
  if (s) console.log("Deleted car with id = 1");
})
.catch(e => console.warn("Something got wrong trying to delete :("));

// Or just clear everything...
db.clear("cars_object_store"); // you can also pass an array of object stores to be cleared

// That's basically all you need to use indexedDB with WebDB, pretty simple, right?

```
