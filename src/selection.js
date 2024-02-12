function create_state(){
  const house_types=$state([])

  return {
    get house_types(){return house_types}
  }
  
}
export const state = create_state()
