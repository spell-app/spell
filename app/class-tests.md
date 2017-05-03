parser.compile(`
define type Card
	property suit as one of ["clubs", "diamonds", "hearts", "spades"]
	get color:
		if my suit is one of ["diamonds", "hearts"] then return "red"
		else return "black"

	property rank as a number
	shared property ranks = ["ace", "2", "3", "4", "5", "6", "7", "8", "9", "10", "jack", "queen", "king"]
	get rank_name: item (my rank) of my ranks

	property face as one of ["up", "down"]

	to turn_face_up: set my face to "up"
	to turn_face_down: set my face to "down"
	to turn_over
		if my face is "up":
			set my face to "down"
		else
			set my face to "up"

	action turn Card over:
		if (the face of the card) is "up" then set the face of the card to "down"
		else set the face of the card to "up"

	action play Card on Pile:
		return failure if (the pile is empty) and (the suit of the card) is not "king"
		return failure if (the color of the card) is not (the color of the last card of the pile)

		add the card to the pile
		return success
`)
