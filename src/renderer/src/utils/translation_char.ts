const translation_char = (old_path:string):string=>{
    let flag = old_path.includes('\\')
    if ( flag ) {
        let list = old_path.split('\\')
        return list.join('/');
    }else{
        return old_path
    }
}

export default translation_char