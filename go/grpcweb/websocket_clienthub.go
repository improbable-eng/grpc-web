package grpcweb

// websocketClientHub maintains the set of active clients and broadcasts
// messages to the clients.  It is based on
// https://github.com/gorilla/websocket/blob/master/examples/chat/hub.go
type websocketClientHub struct {
	// Registered clients.
	clients map[*websocketClient]bool

	// Inbound messages from the clients.
	broadcast chan []byte

	// Register requests from the clients.
	register chan *websocketClient

	// Unregister requests from clients.
	unregister chan *websocketClient
}

func newWebsocketClientHub() *websocketClientHub {
	return &websocketClientHub{
		broadcast:  make(chan []byte),
		register:   make(chan *websocketClient),
		unregister: make(chan *websocketClient),
		clients:    make(map[*websocketClient]bool),
	}
}

func (h *websocketClientHub) run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
		case message := <-h.broadcast:
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
		}
	}
}
