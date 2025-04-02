import { db } from "../helpers/db.js";


const createUser = async ({fullName, email, password, phoneNumber, address}) => {
    try {
        return await db.user.create({
            data: {
                fullName,
                email,
                password,
                phoneNumber,
                address,
                isSeller: false,
                isVerified: false
            }
        });
    } catch (error) {
        console.error("Error creating user:", error);
        throw error;
    }
};

const getUserById = async (id) => {
    try {
        return await db.user.findUnique({
            where: { id }
        });
    } catch (error) {
        return null;
    }
};

const getUserByName = async (username) => {
    try {
        return await db.user.findFirst({
            where: { username }
        });
    } catch (error) {
        return null;
    }
};

const getUserByEmail = async (email) => {
    try {
        return await db.user.findUnique({
            where: { email }
        });
    } catch (error) {
        return null;
    }
};

const updateUser = async (id, data) => {
    try{
        return await db.user.update({
            where: { id },
            data: data
        });
    } catch (error) {
        return null;
    }
};

const deleteUser = async (id) => {
    try {
        return await db.user.delete({
            where: { id }
        });
    } catch (error) {
        return null;
    }
};

export {
    createUser, updateUser, deleteUser,
    getUserById, getUserByName, getUserByEmail,
};
