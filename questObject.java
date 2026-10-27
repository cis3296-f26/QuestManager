public class questObject implements Reward {
    private String taskID;
    private String userID;
    private String description;
    private String title;
    private boolean completed;
    private String difficulty;
    //private boolean rewarded;
    private String repeatRule;

    public questObject(String taskID, String userID, String description, String title, String difficulty) {
        this.taskID = taskID;
        this.userID = userID;
        this.description = description;
        this.title = title;
        this.difficulty = difficulty;
        this.repeatRule = null; 
        //this.rewarded = false;
        this.completed = false;
    }

    // Getters and setters
    public String getTaskID() {
        return taskID;
    }

    public void setTaskID(String taskID) {
        this.taskID = taskID;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getRepeatRule() {
        return repeatRule;
    }

    public void setRepeatRule(String repeatRule) {
        this.repeatRule = repeatRule;
    }

    public String getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(String difficulty) {
        this.difficulty = difficulty;
    }

    /* commented out because it seems redundant for now, maybe we can have a listener or a way to check when
    a quest is completed, and then getDifficulty() and then update reward based off of that 

    public boolean isRewarded() {
        return rewarded;
    }

    public void setRewarded(boolean rewarded) {
        this.rewarded = rewarded;
    }
    */

    public int giveReward(){
        String difficulty = getDifficulty();
        if (difficulty.equals("Easy")) {
            // Give easy reward
            return 10;
        } else if (difficulty.equals("Medium")) {
            // Give medium reward
            return 20;
        } else if (difficulty.equals("Hard")) {
            // Give hard reward
            return 30;
        }
        return 0;
    }

    public boolean isCompleted() {
        return completed;
    }

    public void setCompleted(boolean completed) {
        this.completed = completed;
    }


    //other functions?

    public void complete(){
        this.completed = true;
    }

    public String rename(String newTitle) {
        this.title = newTitle;
        return this.title;
    }

    public void abandonQuest() {
        this.completed = false;
    }


}
