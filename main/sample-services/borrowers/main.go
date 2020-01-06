package main

import (
	"io/ioutil"
	"log"
	"net/http"
	"time"
)

func main() {
	for {
		time.Sleep(10 * time.Second)
		res, err := http.Get("http://127.0.0.1:8080/books-service.custom-mesh/books")

		if err != nil {
			log.Printf("Error occured while calling the books service : %s", err.Error())
			continue
		}

		r, err := ioutil.ReadAll(res.Body)
		if err != nil {
			log.Printf("Unable to process response from the books service : %s", err.Error())
			continue
		}
		log.Printf("Response status code from Books service is : %d", res.StatusCode)
		log.Printf("Response from Books service is : %s", string(r))
	}
}
