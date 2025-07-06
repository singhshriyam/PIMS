import { Href, ImagePath } from "@/Constant";
import { userProfileData } from "@/Data/Layout/Header";
import { getCurrentUser, clearUserData, User } from "../../../../app/(MainBody)/services/userService";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { LogOut } from "react-feather";

const UserProfile = () => {
  const router = useRouter();
  const user = getCurrentUser();

  const handleLogout = () => {
    clearUserData();
    router.push('/auth/login');
  };

  return (
    <li className='profile-nav onhover-dropdown p-0'>
      <div className='d-flex align-items-center profile-media'>
        <Image
          className='b-r-10 img-40 img-fluid'
          width={40}
          height={40}
          src={`${ImagePath}/dashboard/profile.png`}
          alt='Profile'
        />
        <div className='flex-grow-1'>
          <span>{user.email || 'user@example.com'}</span>
          <p className='mb-0'>{user.first_name || 'User'}</p>
        </div>
      </div>
      <ul className='profile-dropdown onhover-show-div'>
        {userProfileData.map((item, index) => (
          <li key={index}>
            <Link href={`/${item.link}`}>
              {item.icon}
              <span>{item.title}</span>
            </Link>
          </li>
        ))}
        <li onClick={handleLogout}>
          <Link href={Href}>
            <LogOut />
            <span>{"Log out"}</span>
          </Link>
        </li>
      </ul>
    </li>
  );
};

export default UserProfile;
