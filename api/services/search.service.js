const db = require("../config/supabase");

const searchDocuments = async (query) => {

    const { data, error } = await db
    .from("document_index")
    .select("*")
    .ilike("content", `%${query}%`);

    if (error) {
        throw new Error(error.message);
    }

    return data;
};

module.exports = {
    searchDocuments,
};


