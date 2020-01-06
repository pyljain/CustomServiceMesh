package main

import "net/http"

import "log"

func main() {
	http.HandleFunc("/books", handleBooksRoute)
	err := http.ListenAndServe("127.0.0.1:8081", nil)
	if err != nil {
		log.Fatalf("Error occured when starting the Books service : %s", err.Error())
	}
}

func handleBooksRoute(res http.ResponseWriter, req *http.Request) {
	resString := "Here are your books"

	res.Write([]byte(resString))
}
