export const PRIORITIES = ["high", "medium", "low"];
export const TASK_TYPES = ["school", "work", "personal", "health", "other"];
export class QuestObject {
    #taskID;
    #userID;
    #description;
    #title;
    #completed;
    #difficulty;
    #repeatRule;
    #rewarded
    #date;
    #priority;
    #taskType;
    #time;
    

    constructor(taskID, userID, title, description, difficulty) {
        this.#taskID = taskID;
        this.#userID = userID;
        this.#title = title;
        this.#description = description;
        this.#date = null;
        this.#time = null;

        //doing a check in the constructor just in case
        if (difficulty === "easy" || difficulty === "medium" || difficulty === "hard") {
            this.#difficulty = difficulty;
        } else {
            throw new Error("Invalid Difficulty");
        }
        this.#completed = false;
        this.#rewarded = false;
        this.#repeatRule = null;
        this.#date = null;
        this.#priority = "medium";
        this.#taskType = "personal";
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
        if (difficulty === "easy" || difficulty === "medium" || difficulty === "hard") {
            this.#difficulty = difficulty;
        } else {
            throw new Error("Invalid Difficulty");
        }
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

    get repeatRule() {
        return this.#repeatRule;
    }

    set repeatRule(repeatRule) {
        this.#repeatRule = repeatRule;
    }

    giveReward() {
        switch (this.#difficulty) {
            case "easy":
                return 10
            case "medium":
                return 20
            case "hard":
                return 30
            default:
                return 0
        }
    }

    complete() {
        this.#completed = true;
    }

    get date() {
        return this.#date;
    }

    set date(d) {
        this.#date = d;
    }   // "YYYY-MM-DD"

    get time() {
        return this.#time;
    }

    set time(time) {
        this.#time = time;
    }
    get priority() {
        return this.#priority;
    }

    set priority(priority) {
        if (PRIORITIES.includes(priority)) {
            this.#priority = priority;
        } else {
            throw new Error("Invalid Priority");
        }
    }

    get taskType() {
        return this.#taskType;
    }

    set taskType(taskType) {
        if (TASK_TYPES.includes(taskType)) {
            this.#taskType = taskType;
        } else {
            throw new Error("Invalid Task Type");
        }
    }
    uncomplete() {
        this.#completed = false;
    }

    markRewarded() {
        this.#rewarded = true;
    }

    // Build a QuestObject from a row of the Supabase "tasks" table.
    static fromRow(row) {
        const quest = new QuestObject(row.id, row.user_id, row.title, row.description, row.difficulty);
        if (row.completed) quest.complete();
        if (row.rewarded) quest.markRewarded();
        quest.repeatRule = row.repeat_rule;
        quest.date = row.task_date;
        quest.time = row.task_time;
        if (PRIORITIES.includes(row.priority)) quest.priority = row.priority;
        if (TASK_TYPES.includes(row.task_type)) quest.taskType = row.task_type;
        return quest;
    }
}