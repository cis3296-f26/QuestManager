const RewardInterface = {
    giveReward: () => {}
}

class QuestObject {
    #taskID;
    #userID;
    #description;
    #title;
    #completed;
    #difficulty;
    #repeatRule;
    #rewarded

    constructor(taskID, userID, title, description, difficulty) {
        this.#taskID = taskID;
        this.#userID = userID;
        this.#title = title;
        this.#description = description;
        this.#difficulty = difficulty;
        this.#completed = false;
        this.#rewarded = false;
        this.#repeatRule = null;
    }

    //getters and setters; the idea of the setters is that we'll connect them to buttons that the user can push
    get taskID() {
        return this.#taskID;
    }

    set taskID(taskID) {
        this.#taskID = taskID;
    }

    get userID() {
        return this.#userID;
    }


    get title() {
        return this.#title;
    }

    set title(title) {
        this.#title = title;
    }

    get description() {
        return this.#description;
    }

    set description(description) {
        this.#description = description;
    }

    get difficulty() {
        return this.#difficulty;
    }

    set difficulty(difficulty) {
        this.#difficulty = difficulty;
    }

    get completed() {
        return this.#completed;
    }

    /* not sure if this is redundant yet
    set completed(completed) {
        this.#completed = completed;
    }
    */

    get rewarded() {
        return this.#rewarded;
    }

    /* same with this since the below complete function is setting it without use of setter method
    set rewarded(rewarded) {
        this.#rewarded = rewarded;
    }
    */

    get repeatRule(){
        return this.#repeatRule;
    }

    set repeatRule(repeatRule) {
        this.#repeatRule = repeatRule;
    }

    giveReward() {
        switch(this.#difficulty){
            case "easy":
                return 10
                break;
            case "medium":
                return 20
                break;
            case "hard":
                return 30
                break;
        }
    }

    complete(){
        this.#completed = true;
        if(!this.#rewarded) { //putting this in an if to check if a reward has been given already
            giveReward();
            this.#rewarded = true;
        }
    }
}