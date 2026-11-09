export class RoomObject {
   #furnitureSlot;

   constructor(furnitureSlot) {
      this.#furnitureSlot = new Map();
   }

    get furnitureSlot() {  
        return this.#furnitureSlot;
    }

    equip(slot, item){
        this.#furnitureSlot.set(slot, item);
    }

    unequip(slot){
        this.#furnitureSlot.delete(slot);
    }

    isEquipped(slot){
        //if the slot doesnt have anything equipped, return false
        if(this.#furnitureSlot.get(slot) === undefined){
            return false;
        }
        return true;
    }


}

